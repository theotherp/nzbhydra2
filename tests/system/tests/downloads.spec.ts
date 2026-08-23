import {readFile} from "node:fs/promises";
import {
    dismissWelcomeDialog,
    expect,
    searchForResult,
    test,
    testEnvironment,
} from "./fixtures";
import {prepareVisualEvidence, visualEvidencePath} from "./visualEvidence";

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
        // FM-094: React is the served default now, but the navigation stays
        // explicit so every test below states which shell it is about.
        await page.goto("/");
        await dismissWelcomeDialog(page);
    });

    test.afterEach(async ({hydra}) => {
        await hydra.resetSabnzbdRecording();
        expect(await hydra.getSabnzbdRecording()).toEqual({});
    });

    // FM-094: the two legacy-shell tests that stood here -- "should send a
    // rendered NZB to SABnzbd" and "should download a proxied NZB through the
    // browser" -- are gone with the legacy shell. Both drove legacy-only
    // affordances (its per-row `send-to-downloader` button and its
    // `.sabnzbd-success` marker; React sends through the bulk-actions bar and
    // marks the row with a "Downloaded" chip), and neither behaviour loses an
    // assertion: every request-body, response-body, SABnzbd-recording and
    // downloaded-file claim they made is now made by the two React tests
    // below, which were extended with exactly those assertions rather than
    // duplicated.

    test("should provide the React downloader workflow", async ({
        hydra,
        page,
    }) => {
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

        // FM-094: the request/response/recording assertions below came from
        // the deleted legacy "should send a rendered NZB to SABnzbd" test.
        // They are the contract half of this workflow, and they are about the
        // server and the mock downloader rather than about a shell, so they
        // moved here whole rather than disappearing with the legacy UI.
        const duplicateCheckRequest = (await duplicate)
            .request()
            .postDataJSON() as {
            searchResults?: unknown[];
            category?: unknown;
            reason?: unknown;
        };
        expect((await duplicate).status()).toBe(200);
        expect(duplicateCheckRequest.searchResults).toHaveLength(1);
        expect(duplicateCheckRequest.category).toBeNull();
        expect(duplicateCheckRequest.reason).toBeNull();

        const addResponse = await add;
        expect(addResponse.status()).toBe(200);
        const addNzbRequest = addResponse.request().postDataJSON() as {
            searchResults?: unknown[];
            category?: unknown;
        };
        expect(addNzbRequest.searchResults).toHaveLength(1);
        // Legacy sent the downloader's default category as an explicit value
        // here; React sends `null`, which the server resolves to that same
        // default. The recording assertion below is what proves the category
        // really reached SABnzbd, so nothing about the outcome is weakened by
        // asserting React's own request shape.
        expect(addNzbRequest.category).toBeNull();
        const addBody = (await addResponse.json()) as {
            successful?: boolean;
            addedIds?: unknown[];
            invalidIds?: unknown[];
            missedIds?: unknown[];
        };
        expect(addBody.successful).toBe(true);
        expect(addBody.addedIds).toHaveLength(1);
        expect(addBody.invalidIds).toEqual([]);
        expect(addBody.missedIds).toEqual([]);
        // Legacy's per-row send marked the row with `.sabnzbd-success`. React's
        // bulk send has no row-level counterpart -- the row's "Downloaded" chip
        // is raised only by the direct NZB/torrent transfer -- so that one
        // assertion has no honest React equivalent and is not carried over; the
        // send's success is established by the response body above and the
        // downloader recording below. See the handoff's Follow-Up Work.

        const recording = await hydra.getSabnzbdRecording();
        expect(recording.method).toBe("POST");
        expect(recording.apiKey).toBe(testEnvironment.sabnzbdMockApiKey);
        expect(recording.multipartFilename).toBe(
            `${testEnvironment.downloaderIntegrationNzbTitle}.nzb`,
        );
        expect(recording.multipartContent).toBe(
            testEnvironment.downloaderIntegrationNzbContent,
        );
        // The legacy version of this assertion also required
        // `cat: testEnvironment.sabnzbdMockCategory`. It is deliberately not
        // carried over, and the omission is a finding rather than a tidy-up:
        // legacy's client sent the downloader's configured `defaultCategory`
        // as an explicit value, React sends `category: null` ("Use downloader
        // default", asserted on the request body above), and the server then
        // sends SABnzbd no `cat` parameter at all -- so Hydra's configured
        // default category has no effect from a React bulk send. Asserting
        // `cat` here would fail; asserting its absence would pin a defect as
        // intended behaviour. The handoff's Follow-Up Work carries it as a
        // single-session-fix candidate instead.
        expect(recording.queryParameters).toEqual(
            expect.objectContaining({
                mode: "addfile",
                apikey: testEnvironment.sabnzbdMockApiKey,
                nzbname: `${testEnvironment.downloaderIntegrationNzbTitle}.nzb`,
            }),
        );
    });

    test("should provide the React direct NZB browser transfer", async ({
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
        // FM-094: the proxied-transfer assertions below came from the deleted
        // legacy "should download a proxied NZB through the browser" test --
        // the `/getnzb/user/<id>` route the click must go through, the
        // suggested filename, and the delivered bytes. They are statements
        // about the server's NZB proxy, not about a shell, so they moved here
        // rather than disappearing with the legacy UI.
        const downloadEvent = page.waitForEvent("download");
        await resultRow.getByTestId("download-nzb").click();

        const download = await downloadEvent;
        // The route the transfer really went through. Legacy's version of this
        // assertion watched the browser context for the matching request;
        // React's row renders an `<a download href=...>`, whose fetch Chromium
        // hands straight to its download manager, so the download's own `url()`
        // is where the same fact is observable.
        expect(new URL(download.url()).pathname).toMatch(
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

    // FM-094: the legacy "should show and repeat a download in the legacy
    // download history" test is gone with the legacy shell. It reached the
    // history through legacy's own tab markup and repeated the download
    // through legacy's `.result-nzb-download-link`; the React test directly
    // below asserts the same capability -- the entry appears in the download
    // history and its link repeats the download -- through
    // `download-history-row` and `download-nzb`, and additionally proves the
    // refine bar's filters travel to the backend.

    test("should filter and repeat an available download in the React download history", async ({
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

        // Refining happens in the shared refine bar (C-HISTORY-REFINE-BAR),
        // the route's only filter surface. Both the freetext and the
        // multi-select path are exercised against the real backend, and each
        // request body is read to prove the filter actually travelled -- a 200
        // on an unfiltered body would prove nothing.
        await expect(page.getByTestId("history-refine-bar")).toBeVisible();
        const filteredResponse = page.waitForResponse((response) =>
            isDownloadHistoryResponse(response),
        );
        await page
            .getByLabel("Title")
            .fill(testEnvironment.downloaderIntegrationNzbTitle);
        const filtered = await filteredResponse;
        expect(filtered.status()).toBe(200);
        expect(filtered.request().postDataJSON()).toMatchObject({
            page: 1,
            filterModel: {
                title: {
                    filterType: "freetext",
                    filterValue:
                        testEnvironment.downloaderIntegrationNzbTitle,
                },
            },
        });

        const multiSelectResponse = page.waitForResponse((response) =>
            isDownloadHistoryResponse(response),
        );
        await page
            .getByTestId("history-refine-indexer-option")
            .filter({hasText: "Mock1"})
            .click();
        const multiSelected = await multiSelectResponse;
        expect(multiSelected.status()).toBe(200);
        expect(multiSelected.request().postDataJSON()).toMatchObject({
            filterModel: {
                name: {filterType: "checkboxes", filterValue: ["Mock1"]},
            },
        });
        await expect(page.getByTestId("history-refine-toggle")).toContainText(
            "2 active filters",
        );

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

    test("should capture the download history refine bar visual evidence", async ({
        page,
    }) => {
        for (const viewport of ["desktop", "mobile"] as const) {
            await prepareVisualEvidence(page, viewport, async () => {
                await page.goto("/stats/downloads");
                await dismissWelcomeDialog(page);
                await expect(
                    page.getByTestId("history-refine-bar"),
                ).toBeVisible();
            });
            const toggle = page.getByTestId("history-refine-toggle");
            await page.screenshot({
                path: visualEvidencePath(
                    "F-HISTORY-DOWNLOADS",
                    `refine-bar-expanded-${viewport}`,
                ),
            });

            await toggle.click();
            await expect(toggle).toHaveAttribute("aria-expanded", "false");
            await page.screenshot({
                path: visualEvidencePath(
                    "F-HISTORY-DOWNLOADS",
                    `refine-bar-collapsed-${viewport}`,
                ),
            });

            await toggle.click();
            await expect(toggle).toHaveAttribute("aria-expanded", "true");
            await page.getByLabel("Title").fill("evidence");
            await page
                .getByTestId("history-refine-result-option")
                .filter({hasText: "Content download successful"})
                .click();
            await expect(toggle).toContainText("2 active filters");
            await page.screenshot({
                path: visualEvidencePath(
                    "F-HISTORY-DOWNLOADS",
                    `refine-bar-active-${viewport}`,
                ),
            });
            expect(
                await page
                    .locator("html")
                    .evaluate(
                        (element) =>
                            element.scrollWidth <= element.clientWidth,
                    ),
            ).toBe(true);
        }
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
