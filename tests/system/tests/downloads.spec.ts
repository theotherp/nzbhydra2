import {readFile} from "node:fs/promises";
import {
    dismissWelcomeDialog,
    expect,
    searchForResult,
    test,
    testEnvironment,
} from "./fixtures";

test.describe("Downloads", () => {
    test.beforeEach(async ({hydra, page}) => {
        await hydra.configureMockIndexers(["1"]);
        await hydra.configureSabnzbdMock();
        // Download history is intentionally retained between runs. Make this scenario's display choice explicit.
        await page.addInitScript(() =>
            window.localStorage.setItem(
                "nzbhydra.hideAlreadyDownloadedResults",
                "false",
            ),
        );
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
        await searchForResult(
            page,
            testEnvironment.downloaderIntegrationQuery,
            testEnvironment.downloaderIntegrationNzbTitle,
        );

        const resultRow = page
            .getByTestId("search-result-row")
            .filter({hasText: testEnvironment.downloaderIntegrationNzbTitle});
        const duplicateCheckResponse = page.waitForResponse(
            (response) =>
                response.request().method() === "PUT" &&
                new URL(response.url()).pathname ===
                    "/internalapi/downloader/checkDuplicateMovieDownload",
        );
        const addNzbResponse = page.waitForResponse(
            (response) =>
                response.request().method() === "PUT" &&
                new URL(response.url()).pathname ===
                    "/internalapi/downloader/addNzbs",
        );
        await resultRow.getByTestId("send-to-downloader").click();

        const duplicateCheckRequest = (await duplicateCheckResponse)
            .request()
            .postDataJSON() as {
            searchResults?: unknown[];
            category?: unknown;
            reason?: unknown;
        };
        expect(duplicateCheckRequest.searchResults).toHaveLength(1);
        expect(duplicateCheckRequest.category).toBeNull();
        expect(duplicateCheckRequest.reason).toBeNull();

        const response = await addNzbResponse;
        expect(response.status()).toBe(200);
        const addNzbRequest = response.request().postDataJSON() as {
            searchResults?: unknown[];
            category?: unknown;
        };
        expect(addNzbRequest.searchResults).toHaveLength(1);
        expect(addNzbRequest.category).toBe(
            testEnvironment.sabnzbdMockCategory,
        );
        const body = (await response.json()) as {
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
        expect(recording.multipartFilename).toBe(
            `${testEnvironment.downloaderIntegrationNzbTitle}.nzb`,
        );
        expect(recording.multipartContent).toBe(
            testEnvironment.downloaderIntegrationNzbContent,
        );
        expect(recording.queryParameters).toEqual(
            expect.objectContaining({
                mode: "addfile",
                apikey: testEnvironment.sabnzbdMockApiKey,
                cat: testEnvironment.sabnzbdMockCategory,
                nzbname: `${testEnvironment.downloaderIntegrationNzbTitle}.nzb`,
            }),
        );
    });

    test("should download a proxied NZB through the browser", async ({
        context,
        page,
    }) => {
        await searchForResult(
            page,
            testEnvironment.downloaderIntegrationQuery,
            testEnvironment.downloaderIntegrationNzbTitle,
        );

        const resultRow = page
            .getByTestId("search-result-row")
            .filter({hasText: testEnvironment.downloaderIntegrationNzbTitle});
        await expect(
            resultRow,
            "A prior download must not hide this deterministic result",
        ).toBeVisible();
        const downloadEvent = page.waitForEvent("download");
        const downloadRequest = context.waitForEvent(
            "request",
            (request) =>
                request.method() === "GET" &&
                /^\/getnzb\/user\/[^/]+$/.test(new URL(request.url()).pathname),
        );
        await resultRow.getByTestId("download-nzb").click();

        const [download, request] = await Promise.all([
            downloadEvent,
            downloadRequest,
        ]);
        expect(new URL(request.url()).pathname).toMatch(
            /^\/getnzb\/user\/[^/]+$/,
        );
        expect(await download.failure()).toBeNull();
        expect(download.suggestedFilename()).toBe(
            `${testEnvironment.downloaderIntegrationNzbTitle}.nzb`,
        );

        const path = await download.path();
        expect(path).not.toBeNull();
        expect(await readFile(path as string, "utf8")).toBe(
            testEnvironment.downloaderIntegrationNzbContent,
        );
    });

    test("should provide the React downloader workflow", async ({
        hydra,
        page,
    }) => {
        await page.goto("ui/react?redirect=/");
        await dismissWelcomeDialog(page);
        await searchForResult(
            page,
            testEnvironment.downloaderIntegrationQuery,
            testEnvironment.downloaderIntegrationNzbTitle,
        );
        const resultRow = page
            .getByTestId("search-result-row")
            .filter({hasText: testEnvironment.downloaderIntegrationNzbTitle});
        await resultRow
            .getByRole("checkbox", {
                name: `Select ${testEnvironment.downloaderIntegrationNzbTitle}`,
            })
            .check();
        const duplicate = page.waitForResponse(
            (response) =>
                response.request().method() === "PUT" &&
                new URL(response.url()).pathname ===
                    "/internalapi/downloader/checkDuplicateMovieDownload",
        );
        const add = page.waitForResponse(
            (response) =>
                response.request().method() === "PUT" &&
                new URL(response.url()).pathname ===
                    "/internalapi/downloader/addNzbs",
        );
        await page
            .getByRole("button", {name: "Send selected to downloader"})
            .click();
        expect((await duplicate).status()).toBe(200);
        expect((await add).status()).toBe(200);
        expect((await hydra.getSabnzbdRecording()).method).toBe("POST");
    });

    test("should provide the React direct NZB browser transfer", async ({
        page,
    }) => {
        await page.goto("ui/react?redirect=/");
        await dismissWelcomeDialog(page);
        await searchForResult(
            page,
            testEnvironment.downloaderIntegrationQuery,
            testEnvironment.downloaderIntegrationNzbTitle,
        );
        const resultRow = page
            .getByTestId("search-result-row")
            .filter({hasText: testEnvironment.downloaderIntegrationNzbTitle});
        const downloadEvent = page.waitForEvent("download");
        await resultRow.getByTestId("download-nzb").click();
        const download = await downloadEvent;
        expect(await download.failure()).toBeNull();
    });

    test("should show and repeat a download in the legacy download history", async ({
        page,
    }) => {
        await searchForResult(
            page,
            testEnvironment.downloaderIntegrationQuery,
            testEnvironment.downloaderIntegrationNzbTitle,
        );
        const resultRow = page
            .getByTestId("search-result-row")
            .filter({hasText: testEnvironment.downloaderIntegrationNzbTitle});
        const firstDownloadEvent = page.waitForEvent("download");
        await resultRow.getByTestId("download-nzb").click();
        expect(await (await firstDownloadEvent).failure()).toBeNull();

        await page
            .getByRole("link", {name: "History & Stats", exact: true})
            .click();
        await page
            .getByRole("tab", {name: "Download history", exact: true})
            .click();
        const historyRow = page
            .getByRole("row", {
                name: testEnvironment.downloaderIntegrationNzbTitle,
            })
            .first();
        await expect(historyRow).toBeVisible();

        const repeatDownloadEvent = page.waitForEvent("download");
        await historyRow.locator(".result-nzb-download-link").click();
        expect(await (await repeatDownloadEvent).failure()).toBeNull();
    });

    test("should filter and repeat an available download in the React download history", async ({
        page,
    }) => {
        await page.goto("ui/react?redirect=/");
        await dismissWelcomeDialog(page);
        await searchForResult(
            page,
            testEnvironment.downloaderIntegrationQuery,
            testEnvironment.downloaderIntegrationNzbTitle,
        );
        const resultRow = page
            .getByTestId("search-result-row")
            .filter({hasText: testEnvironment.downloaderIntegrationNzbTitle});
        const firstDownloadEvent = page.waitForEvent("download");
        await resultRow.getByTestId("download-nzb").click();
        expect(await (await firstDownloadEvent).failure()).toBeNull();

        const historyResponse = page.waitForResponse((response) =>
            isDownloadHistoryResponse(response),
        );
        await page
            .getByRole("link", {name: "History & Stats", exact: true})
            .click();
        await page
            .getByRole("tab", {name: "Download history", exact: true})
            .click();
        expect((await historyResponse).status()).toBe(200);

        const filteredResponse = page.waitForResponse((response) =>
            isDownloadHistoryResponse(response),
        );
        await page
            .getByLabel("Title")
            .fill(testEnvironment.downloaderIntegrationNzbTitle);
        expect((await filteredResponse).status()).toBe(200);

        // Download history is retained across runs, so an earlier run's entry
        // for the same deterministic title may still match; the newest
        // (this run's) row sorts first under the default time-descending
        // sort.
        const historyRow = page
            .getByTestId("download-history-table")
            .getByTestId("download-history-row")
            .filter({hasText: testEnvironment.downloaderIntegrationNzbTitle})
            .first();
        await expect(historyRow).toBeVisible();
        await expect(
            historyRow.getByTestId("download-history-status"),
        ).toContainText(/\S/);

        const repeatDownloadEvent = page.waitForEvent("download");
        await historyRow.getByTestId("download-nzb").click();
        expect(await (await repeatDownloadEvent).failure()).toBeNull();

        await page.setViewportSize({width: 390, height: 844});
        expect(
            await page
                .locator("html")
                .evaluate((element) => element.scrollWidth <= element.clientWidth),
        ).toBe(true);
    });
});

function isDownloadHistoryResponse(
    response: import("@playwright/test").Response,
): boolean {
    return (
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/internalapi/history/downloads"
    );
}
