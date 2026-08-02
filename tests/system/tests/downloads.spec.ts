import {readFile} from "node:fs/promises";
import {dismissWelcomeDialog, expect, searchForResult, test, testEnvironment} from "./fixtures";

test.describe("Downloads", () => {
    test.beforeEach(async ({hydra, page}) => {
        await hydra.configureMockIndexers(["1"]);
        await hydra.configureSabnzbdMock();
        // Download history is intentionally retained between runs. Make this scenario's display choice explicit.
        await page.addInitScript(() => window.localStorage.setItem("nzbhydra.hideAlreadyDownloadedResults", "false"));
        await page.goto("/");
        await dismissWelcomeDialog(page);
    });

    test.afterEach(async ({hydra}) => {
        await hydra.resetSabnzbdRecording();
        expect(await hydra.getSabnzbdRecording()).toEqual({});
    });

    test("should send a rendered NZB to SABnzbd", async ({hydra, page}) => {
        await hydra.resetSabnzbdRecording();
        expect(await hydra.getSabnzbdRecording()).toEqual({});
        await searchForResult(page, testEnvironment.downloaderIntegrationQuery, testEnvironment.downloaderIntegrationNzbTitle);

        const resultRow = page.getByTestId("search-result-row").filter({hasText: testEnvironment.downloaderIntegrationNzbTitle});
        const addNzbResponse = page.waitForResponse(response =>
            response.request().method() === "PUT" && new URL(response.url()).pathname === "/internalapi/downloader/addNzbs");
        await resultRow.getByTestId("send-to-downloader").click();

        const response = await addNzbResponse;
        expect(response.status()).toBe(200);
        const body = await response.json() as {
            successful?: boolean;
            addedIds?: unknown[];
            invalidIds?: unknown[];
            missedIds?: unknown[];
        };
        expect(body.successful).toBe(true);
        expect(body.addedIds).toHaveLength(1);
        expect(body.invalidIds).toEqual([]);
        expect(body.missedIds).toEqual([]);
        await expect(resultRow.locator(".sabnzbd-success")).toBeVisible();

        const recording = await hydra.getSabnzbdRecording();
        expect(recording.method).toBe("POST");
        expect(recording.apiKey).toBe(testEnvironment.sabnzbdMockApiKey);
        expect(recording.multipartFilename).toBe(`${testEnvironment.downloaderIntegrationNzbTitle}.nzb`);
        expect(recording.multipartContent).toBe(testEnvironment.downloaderIntegrationNzbContent);
        expect(recording.queryParameters).toEqual(expect.objectContaining({
            mode: "addfile",
            apikey: testEnvironment.sabnzbdMockApiKey,
            cat: testEnvironment.sabnzbdMockCategory,
            nzbname: `${testEnvironment.downloaderIntegrationNzbTitle}.nzb`,
        }));
    });

    test("should download a proxied NZB through the browser", async ({context, page}) => {
        await searchForResult(page, testEnvironment.downloaderIntegrationQuery, testEnvironment.downloaderIntegrationNzbTitle);

        const resultRow = page.getByTestId("search-result-row").filter({hasText: testEnvironment.downloaderIntegrationNzbTitle});
        await expect(resultRow, "A prior download must not hide this deterministic result").toBeVisible();
        const downloadEvent = page.waitForEvent("download");
        const downloadRequest = context.waitForEvent("request", request =>
            request.method() === "GET" && /^\/getnzb\/user\/[^/]+$/.test(new URL(request.url()).pathname));
        await resultRow.getByTestId("download-nzb").click();

        const [download, request] = await Promise.all([downloadEvent, downloadRequest]);
        expect(new URL(request.url()).pathname).toMatch(/^\/getnzb\/user\/[^/]+$/);
        expect(await download.failure()).toBeNull();
        expect(download.suggestedFilename()).toBe(`${testEnvironment.downloaderIntegrationNzbTitle}.nzb`);

        const path = await download.path();
        expect(path).not.toBeNull();
        expect(await readFile(path as string, "utf8")).toBe(testEnvironment.downloaderIntegrationNzbContent);
    });
});
