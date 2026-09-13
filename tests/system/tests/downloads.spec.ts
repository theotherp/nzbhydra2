import {readdir, readFile} from "node:fs/promises";
import {join} from "node:path";

import type {Locator, Page} from "@playwright/test";
import {
    dismissWelcomeDialog,
    expect,
    openRefineMultiselect,
    searchForResult,
    test,
    testEnvironment,
} from "./fixtures";
import {prepareVisualEvidence, visualEvidencePath} from "./visualEvidence";

/**
 * FM-160: the direct-download anchor carries `target="_blank"` (legacy
 * parity) rather than `download`, so Chromium opens the transfer in a popup
 * tab instead of firing `download` directly on the originating page --
 * `page.waitForEvent("download")` alone (the pre-FM-160 wait) never resolves
 * once the transfer moves off the opener page like that; nor does awaiting it
 * on the popup page Playwright hands back from the `"popup"` event, because
 * Chromium's own download manager intercepts the popup's navigation before
 * that page ever finishes loading, so no `"download"` fires *on* the popup
 * page object either. The context-level event does still fire (Playwright
 * attributes every context's downloads to it regardless of which page
 * triggered them), so waiting there is what actually observes the transfer.
 * The route/filename/bytes assertions the caller makes afterward are
 * unaffected, only which object the `download` event is awaited on changes.
 */
async function clickAndAwaitPopupDownload(page: Page, control: Locator) {
    const [download] = await Promise.all([
        page.context().waitForEvent("download"),
        control.click(),
    ]);
    return download;
}

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
        // The category is resolved client-side, exactly as legacy did: an
        // unset choice in the bulk bar sends the downloader's configured
        // `defaultCategory` as an explicit value. The server resolves nothing
        // -- `Downloader.addBySearchResultIds` interprets only the three
        // sentinel strings and forwards everything else, `null` included,
        // unchanged -- so a `null` here would reach SABnzbd as no `cat` at
        // all. FM-114 restored this assertion, which FM-094 had dropped.
        expect(addNzbRequest.category).toBe(
            testEnvironment.sabnzbdMockCategory,
        );
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
        // FM-128: legacy's per-row send marked the row with
        // `.sabnzbd-success`, and until FM-128 nothing in this file claimed a
        // React equivalent -- the comment that stood here asserted there was
        // none. There is: the bulk send raises the row's "Downloaded" chip and
        // drops the row from the selection. It never fired, because the shared
        // download-action response schema bounded `addedIds` by
        // `Number.MAX_SAFE_INTEGER` while the backend sends 64-bit ids, so
        // every successful send was reported to the user as
        // "Unable to complete the download action.". Asserting the row's own
        // state here -- not just the response body and the SABnzbd recording
        // below -- is what makes that class of failure visible: both are
        // server-side facts that stayed green throughout.
        await expect(resultRow.getByText("Downloaded")).toBeVisible();
        await expect(
            resultRow.getByRole("checkbox", {
                name: `Select ${testEnvironment.downloaderIntegrationNzbTitle}`,
            }),
        ).not.toBeChecked();
        // Visual Gate (FM-128): the post-send row, to be read beside the
        // pre-fix capture at
        // `visual-evidence/F-SEARCH-DOWNLOADS/fm128-bulk-send-observed-failure.png`,
        // where the same row sits checked and chip-less after an identical,
        // server-side-successful send.
        await prepareVisualEvidence(page, "desktop", async () => {
            await expect(resultRow.getByText("Downloaded")).toBeVisible();
        });
        await page.screenshot({
            path: visualEvidencePath(
                "F-SEARCH-DOWNLOADS",
                "bulk-send-downloaded-row-desktop",
            ),
        });

        // The chip belongs to the row, not to the selection that produced it,
        // so re-grouping the table must not drop it: grouped and ungrouped
        // display modes render through the same `ResultRow`.
        await page.getByTestId("display-options-toggle").click();
        await page
            .getByRole("checkbox", {name: "Group torrent and Usenet results"})
            .check();
        await page.keyboard.press("Escape");
        await expect(resultRow.getByText("Downloaded")).toBeVisible();

        const recording = await hydra.getSabnzbdRecording();
        expect(recording.method).toBe("POST");
        expect(recording.apiKey).toBe(testEnvironment.sabnzbdMockApiKey);
        expect(recording.multipartFilename).toBe(
            `${testEnvironment.downloaderIntegrationNzbTitle}.nzb`,
        );
        expect(recording.multipartContent).toBe(
            testEnvironment.downloaderIntegrationNzbContent,
        );
        // `cat` is the end of the chain the request assertion above starts:
        // the client resolves the unset choice to the downloader's configured
        // `defaultCategory`, and `Sabnzbd.addContent` passes a non-empty
        // category on as `cat`. It only reaches SABnzbd because the client
        // sent it -- FM-094 dropped this assertion together with the legacy
        // suite, and while it was gone the React bulk send silently sent no
        // category at all (FM-114).
        expect(recording.queryParameters).toEqual(
            expect.objectContaining({
                mode: "addfile",
                apikey: testEnvironment.sabnzbdMockApiKey,
                cat: testEnvironment.sabnzbdMockCategory,
                nzbname: `${testEnvironment.downloaderIntegrationNzbTitle}.nzb`,
            }),
        );
    });

    // FM-186: the same workflow driven from the row itself -- legacy's
    // `addable-nzb` icon, which React never had. It makes the bulk case's
    // claims again rather than trusting that "it is the same flow": the
    // request body, the response body, the SABnzbd recording and the row's
    // own `Downloaded` chip are what prove the row control reaches the real
    // downloader with a resolved category, and they are exactly what would
    // stay green if the shared flow were wired up wrongly for one caller.
    test("should send a single result to SABnzbd from its own row", async ({
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
        const sendButton = resultRow.getByRole("button", {
            name: "Send to Deterministic SABnzbd",
        });
        await expect(sendButton).toBeVisible();
        // Visual Gate (FM-186): the row with one enabled downloader, before
        // the send.
        await prepareVisualEvidence(page, "desktop", async () => {
            await expect(sendButton).toBeVisible();
        });
        await page.screenshot({
            path: visualEvidencePath(
                "F-SEARCH-DOWNLOADS",
                "row-send-one-downloader-desktop",
            ),
        });
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
        await sendButton.click();

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
            downloaderName?: unknown;
            searchResults?: unknown[];
            category?: unknown;
        };
        expect(addNzbRequest.downloaderName).toBe("Deterministic SABnzbd");
        // One row, one entry -- not the whole selection, and not the whole
        // result set.
        expect(addNzbRequest.searchResults).toHaveLength(1);
        // The row control has no category picker (legacy's `alwaysAsk` modal
        // is a recorded gap), so it resolves the downloader's configured
        // default exactly as the bulk bar does for an unset choice.
        expect(addNzbRequest.category).toBe(
            testEnvironment.sabnzbdMockCategory,
        );
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
        // Legacy marked the row's own icon `-success` only when the response
        // named this result's id; React's equivalent is the row's chip
        // (ADR-0006), raised by the same test.
        await expect(resultRow.getByText("Downloaded")).toBeVisible();
        await expect(
            page.getByText("Sent to Deterministic SABnzbd."),
        ).toBeVisible();
        // Visual Gate (FM-186): the row after a successful send from it.
        await prepareVisualEvidence(page, "desktop", async () => {
            await expect(resultRow.getByText("Downloaded")).toBeVisible();
        });
        await page.screenshot({
            path: visualEvidencePath(
                "F-SEARCH-DOWNLOADS",
                "row-send-downloaded-row-desktop",
            ),
        });

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

    // FM-186: the Actions track grows by one 24px button plus its 4px gap per
    // enabled downloader (`actionsTrackWidth`), and the point of that formula
    // is that the row's non-wrapping icon group still fits. Two enabled
    // downloaders is the count this repository's configuration can produce
    // against real mocks, and a browser is the only place the claim means
    // anything -- jsdom resolves neither the `<colgroup>` rules nor a wrap.
    test("should fit two downloaders' send buttons on the row's icon line without overflow", async ({
        hydra,
        page,
    }) => {
        await hydra.configureSabnzbdMock({withNzbGet: true});
        // The shell reads the safe configuration once at bootstrap and
        // refreshes it only after a save made *in this browser* (ADR-0017), so
        // a downloader added through the API after `beforeEach`'s navigation
        // needs a reload to reach the rendered rows.
        await page.goto("/");
        await dismissWelcomeDialog(page);
        await searchForResult(
            page,
            testEnvironment.downloaderIntegrationQuery,
            testEnvironment.downloaderIntegrationNzbTitle,
        );
        const resultRow = page
            .getByTestId("search-result-row")
            .filter({hasText: testEnvironment.downloaderIntegrationNzbTitle});
        const sendButtons = resultRow.getByTestId("result-send-to-downloader");
        await expect(sendButtons).toHaveCount(2);
        await expect(
            resultRow.getByRole("button", {
                name: "Send to Deterministic SABnzbd",
            }),
        ).toBeVisible();
        await expect(
            resultRow.getByRole("button", {
                name: `Send to ${testEnvironment.nzbgetMockName}`,
            }),
        ).toBeVisible();
        for (const viewport of [
            {width: 1280, height: 800},
            {width: 1024, height: 768},
        ]) {
            await page.setViewportSize(viewport);
            const download = await resultRow
                .getByTestId("download-nzb")
                .boundingBox();
            expect(download).not.toBeNull();
            for (const index of [0, 1]) {
                const box = await sendButtons.nth(index).boundingBox();
                expect(box).not.toBeNull();
                // Same line as the direct download: a wrapped group would put
                // this button a row height lower.
                expect(box?.y).toBeCloseTo(download?.y as number, 0);
            }
            const overflow = await page.evaluate(
                () =>
                    document.documentElement.scrollWidth -
                    document.documentElement.clientWidth,
            );
            expect(overflow).toBeLessThanOrEqual(1);
        }
        // Visual Gate (FM-186): the two-downloader row at both evidence
        // viewports -- desktop, and the phone card layout where the Actions
        // cell is a block rather than a track.
        await prepareVisualEvidence(page, "desktop", async () => {
            await expect(sendButtons).toHaveCount(2);
        });
        await page.screenshot({
            path: visualEvidencePath(
                "F-SEARCH-DOWNLOADS",
                "row-send-two-downloaders-desktop",
            ),
        });
        await prepareVisualEvidence(page, "mobile", async () => {
            await expect(sendButtons).toHaveCount(2);
        });
        await page.screenshot({
            path: visualEvidencePath(
                "F-SEARCH-DOWNLOADS",
                "row-send-two-downloaders-mobile",
            ),
        });
    });

    // FM-187: legacy's `save-or-send-file` control, restored on the row. The
    // torrent case is the one that needs a real backend most: the endpoint
    // writes a file, and `FileHandler.java:188-203` *skips* a same-named file
    // that already exists while still answering `successful: true` with the
    // id in `addedIds`. Only reading the folder back distinguishes "written"
    // from "skipped", which is why `configureBlackHole` empties it first.
    test("should save a torrent to the black hole from its own row", async ({
        hydra,
        page,
    }) => {
        await hydra.configureBlackHole({torrents: true});
        // The shell reads the safe configuration once at bootstrap and
        // refreshes it only after a save made *in this browser* (ADR-0017),
        // so a black hole configured through the API after `beforeEach`'s
        // navigation needs a reload to reach the rendered rows.
        await page.goto("/");
        await dismissWelcomeDialog(page);
        // Not `searchForResult`: the baseline's newznab mocks answer this
        // query with twenty generic results of their own beside the one
        // torznab torrent, and the table is virtualized, so the torrent's row
        // need not be in the DOM at all. The refine title filter narrows the
        // rendered rows to it. The Actions slot is derived from the
        // *unfiltered* loaded results, so filtering does not disturb what
        // this case is about.
        await page
            .getByTestId("search-query")
            .fill(testEnvironment.torrentFileQuery);
        const searchResponse = page.waitForResponse(
            (response) =>
                response.request().method() === "POST" &&
                new URL(response.url()).pathname === "/internalapi/search",
        );
        await page.getByTestId("search-submit").click();
        expect((await searchResponse).status()).toBe(200);
        await expect(page.getByTestId("search-status-modal")).toBeHidden();
        await page
            .getByTestId("refine-filter-title")
            .fill(testEnvironment.torrentFileTitle);
        await expect(
            page
                .getByTestId("search-result-title")
                .filter({hasText: testEnvironment.torrentFileTitle}),
        ).toBeVisible();
        const resultRow = page
            .getByTestId("search-result-row")
            .filter({hasText: testEnvironment.torrentFileTitle});
        const blackHoleButton = resultRow.getByTestId(
            "result-send-to-black-hole",
        );
        await expect(blackHoleButton).toHaveAttribute(
            "aria-label",
            "Save torrent to black hole or send magnet link",
        );
        // Visual Gate (FM-187): the torrent row with the button, idle.
        await prepareVisualEvidence(page, "desktop", async () => {
            await expect(blackHoleButton).toBeVisible();
        });
        await page.screenshot({
            path: visualEvidencePath(
                "F-SEARCH-DOWNLOADS",
                "row-black-hole-torrent-desktop",
            ),
        });
        // Visual Gate (FM-187): the same row as a phone card, where the
        // Actions cell is a block rather than a track.
        await prepareVisualEvidence(page, "mobile", async () => {
            await expect(blackHoleButton).toBeVisible();
        });
        await page.screenshot({
            path: visualEvidencePath(
                "F-SEARCH-DOWNLOADS",
                "row-black-hole-torrent-mobile",
            ),
        });
        await page.setViewportSize({width: 1280, height: 800});

        const save = page.waitForResponse(
            (response) =>
                response.request().method() === "PUT" &&
                new URL(response.url()).pathname ===
                    "/internalapi/saveOrSendTorrents",
        );
        await blackHoleButton.click();
        const saveResponse = await save;
        expect(saveResponse.status()).toBe(200);
        // The endpoint takes bare download ids -- one row, one id.
        const requestedIds = saveResponse.request().postDataJSON() as unknown[];
        expect(requestedIds).toHaveLength(1);
        const saveBody = (await saveResponse.json()) as {
            successful?: boolean;
            addedIds?: unknown[];
            missedIds?: unknown[];
            invalidIds?: unknown[];
        };
        expect(saveBody.successful).toBe(true);
        expect(saveBody.addedIds).toHaveLength(1);
        expect(saveBody.missedIds).toEqual([]);
        expect(saveBody.invalidIds).toEqual([]);
        await expect(resultRow.getByText("Downloaded")).toBeVisible();
        await expect(page.getByText("Saved or sent torrent.")).toBeVisible();
        // Visual Gate (FM-187): the torrent row after a successful save.
        await prepareVisualEvidence(page, "desktop", async () => {
            await expect(resultRow.getByText("Downloaded")).toBeVisible();
        });
        await page.screenshot({
            path: visualEvidencePath(
                "F-SEARCH-DOWNLOADS",
                "row-black-hole-torrent-saved-desktop",
            ),
        });

        const torrentPath = join(
            testEnvironment.blackholeFolderTestAccess,
            `${testEnvironment.torrentFileTitle}.torrent`,
        );
        expect(
            await readdir(testEnvironment.blackholeFolderTestAccess),
        ).toEqual([`${testEnvironment.torrentFileTitle}.torrent`]);
        expect(await readFile(torrentPath, "utf8")).toBe(
            testEnvironment.torrentFileContent,
        );
    });

    test("should save an NZB to the black hole from its own row", async ({
        hydra,
        page,
    }) => {
        await hydra.configureBlackHole({nzbs: true});
        await page.goto("/");
        await dismissWelcomeDialog(page);
        await searchForResult(
            page,
            testEnvironment.downloaderIntegrationQuery,
            testEnvironment.downloaderIntegrationNzbTitle,
        );
        const resultRow = page
            .getByTestId("search-result-row")
            .filter({hasText: testEnvironment.downloaderIntegrationNzbTitle});
        const blackHoleButton = resultRow.getByTestId(
            "result-send-to-black-hole",
        );
        await expect(blackHoleButton).toHaveAttribute(
            "aria-label",
            "Save NZB to black hole",
        );
        // Visual Gate (FM-187): the NZB row with `saveNzbsTo` set, beside the
        // send-to-downloader button `beforeEach` configures.
        await prepareVisualEvidence(page, "desktop", async () => {
            await expect(blackHoleButton).toBeVisible();
        });
        await page.screenshot({
            path: visualEvidencePath(
                "F-SEARCH-DOWNLOADS",
                "row-black-hole-nzb-desktop",
            ),
        });

        const save = page.waitForResponse(
            (response) =>
                response.request().method() === "PUT" &&
                new URL(response.url()).pathname ===
                    "/internalapi/saveNzbsToBlackhole",
        );
        await blackHoleButton.click();
        const saveResponse = await save;
        expect(saveResponse.status()).toBe(200);
        expect(saveResponse.request().postDataJSON() as unknown[]).toHaveLength(
            1,
        );
        const saveBody = (await saveResponse.json()) as {
            successful?: boolean;
            addedIds?: unknown[];
            missedIds?: unknown[];
            invalidIds?: unknown[];
        };
        expect(saveBody.successful).toBe(true);
        expect(saveBody.addedIds).toHaveLength(1);
        expect(saveBody.missedIds).toEqual([]);
        expect(saveBody.invalidIds).toEqual([]);
        await expect(resultRow.getByText("Downloaded")).toBeVisible();
        await expect(page.getByText("Saved NZB to black hole.")).toBeVisible();

        const written = await readdir(
            testEnvironment.blackholeFolderTestAccess,
        );
        expect(written).toEqual([
            `${testEnvironment.downloaderIntegrationNzbTitle}.nzb`,
        ]);
        expect(
            await readFile(
                join(testEnvironment.blackholeFolderTestAccess, written[0]),
                "utf8",
            ),
        ).toBe(testEnvironment.downloaderIntegrationNzbContent);
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
        const download = await clickAndAwaitPopupDownload(
            page,
            resultRow.getByTestId("download-nzb"),
        );
        // The route the transfer really went through. Legacy's version of this
        // assertion watched the browser context for the matching request;
        // React's row renders an `<a target="_blank" href=...>` (FM-160), whose
        // fetch Chromium hands straight to its download manager in the popup
        // tab it opens, so the download's own `url()` is where the same fact
        // is observable.
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
    // refine surface's filters travel to the backend.

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
        const firstDownload = await clickAndAwaitPopupDownload(
            page,
            resultRow.getByTestId("download-nzb"),
        );
        expect(await firstDownload.failure()).toBeNull();

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

        // Refining happens in the shared refine surface
        // (C-HISTORY-REFINE-BAR docked through C-REFINE-SURFACE), the route's
        // only filter surface. Both the freetext and the multi-select path are
        // exercised against the real backend, and each request body is read to
        // prove the filter actually travelled -- a 200 on an unfiltered body
        // would prove nothing.
        await expect(page.getByTestId("history-refine-bar")).toBeVisible();
        const filteredResponse = page.waitForResponse((response) =>
            isDownloadHistoryResponse(response),
        );
        await page
            .getByTestId("history-refine-bar")
            .getByLabel("Title")
            .fill(testEnvironment.downloaderIntegrationNzbTitle);
        const filtered = await filteredResponse;
        expect(filtered.status()).toBe(200);
        expect(filtered.request().postDataJSON()).toMatchObject({
            page: 1,
            filterModel: {
                title: {
                    filterType: "freetext",
                    filterValue: testEnvironment.downloaderIntegrationNzbTitle,
                },
            },
        });

        const multiSelectResponse = page.waitForResponse((response) =>
            isDownloadHistoryResponse(response),
        );
        await openRefineMultiselect(page, "indexer");
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
        // ADR-0046: the active-filter summary renders in the shared shell's
        // header summary slot now, not inside the old bar's toggle.
        await expect(page.getByTestId("history-refine-summary")).toHaveText(
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

        const repeatDownload = await clickAndAwaitPopupDownload(
            page,
            historyRow.getByTestId("download-nzb"),
        );
        expect(await repeatDownload.failure()).toBeNull();

        await page.setViewportSize({width: 390, height: 844});
        expect(
            await page
                .locator("html")
                .evaluate(
                    (element) => element.scrollWidth <= element.clientWidth,
                ),
        ).toBe(true);
    });

    /**
     * FM-126 (ADR-0038): the table scrolls inside its own container at 390px
     * and marks the edge it is clipping, so nothing continues off-canvas
     * silently. The affordance's full semantics are pinned on
     * `search-history.spec.ts`; this is the same shared component on this
     * route's own table, at its own measured width floor.
     */
    test("should scroll the table inside its container with a scroll-edge affordance at 390px", async ({
        page,
    }) => {
        await prepareVisualEvidence(page, "mobile", async () => {
            await page.goto("/stats/downloads");
            await dismissWelcomeDialog(page);
            await expect(
                page.getByTestId("download-history-table"),
            ).toBeVisible();
        });

        expect(
            await page
                .locator("html")
                .evaluate(
                    (element) => element.scrollWidth <= element.clientWidth,
                ),
        ).toBe(true);

        const scroller = page.getByTestId("download-history-scroller");
        const geometry = await scroller.evaluate((element) => ({
            client: element.clientWidth,
            scrollable: element.scrollWidth,
            table: (element.firstElementChild as HTMLElement).clientWidth,
        }));
        expect(geometry.table).toBeGreaterThanOrEqual(640);
        expect(geometry.scrollable).toBeGreaterThan(geometry.client);

        await expect(
            page.getByTestId("table-scroll-affordance-end"),
        ).toBeVisible();
        await expect(
            page.getByTestId("table-scroll-affordance-start"),
        ).toHaveCount(0);
        // The table sits below the page heading row, so bring it into the
        // frame: a strip of the page header is not evidence of a table.
        await page
            .getByTestId("download-history-table")
            .scrollIntoViewIfNeeded();
        await page.screenshot({
            path: visualEvidencePath(
                "F-HISTORY-DOWNLOADS",
                "table-scroll-affordance-mobile",
            ),
        });

        await scroller.evaluate((element) => {
            element.scrollLeft = element.scrollWidth;
        });
        await expect(
            page.getByTestId("table-scroll-affordance-end"),
        ).toHaveCount(0);
        await expect(
            page.getByTestId("table-scroll-affordance-start"),
        ).toBeVisible();
        // The table sits below the page heading row, so bring it into the
        // frame: a strip of the page header is not evidence of a table.
        await page
            .getByTestId("download-history-table")
            .scrollIntoViewIfNeeded();
        await page.screenshot({
            path: visualEvidencePath(
                "F-HISTORY-DOWNLOADS",
                "table-scroll-affordance-scrolled-mobile",
            ),
        });

        await prepareVisualEvidence(page, "desktop", async () => {
            await page.goto("/stats/downloads");
            await expect(
                page.getByTestId("download-history-table"),
            ).toBeVisible();
        });
        await expect(
            page.getByTestId("table-scroll-affordance-end"),
        ).toHaveCount(0);
        // The table sits below the page heading row, so bring it into the
        // frame: a strip of the page header is not evidence of a table.
        await page
            .getByTestId("download-history-table")
            .scrollIntoViewIfNeeded();
        await page.screenshot({
            path: visualEvidencePath(
                "F-HISTORY-DOWNLOADS",
                "table-scroll-affordance-desktop",
            ),
        });
    });

    /**
     * ADR-0046 (FM-137): at 1280px the surface is a docked column collapsing
     * to a rail in place; at 390px that branch does not exist and the sections
     * are reachable only through the drawer the compact "Refine" trigger
     * opens. Exactly one branch is in the DOM at a time.
     */
    test("should capture the download history refine surface visual evidence", async ({
        page,
    }) => {
        await prepareVisualEvidence(page, "desktop", async () => {
            await page.goto("/stats/downloads");
            await dismissWelcomeDialog(page);
            await expect(page.getByTestId("history-refine-bar")).toBeVisible();
        });
        const toggle = page.getByTestId("history-refine-toggle");
        await expect(page.getByTestId("history-refine-summary")).toHaveText(
            "No active filters",
        );
        await page.screenshot({
            path: visualEvidencePath(
                "F-HISTORY-DOWNLOADS",
                "refine-surface-expanded-desktop",
            ),
        });

        await toggle.click();
        await expect(toggle).toHaveAttribute("aria-expanded", "false");
        // The rail hides the summary, so the control that reveals it carries
        // the same sentence as its accessible name.
        await expect(toggle).toHaveAccessibleName(
            "Expand history filters, No active filters",
        );
        await page.screenshot({
            path: visualEvidencePath(
                "F-HISTORY-DOWNLOADS",
                "refine-surface-collapsed-desktop",
            ),
        });

        await toggle.click();
        await expect(toggle).toHaveAttribute("aria-expanded", "true");
        await page
            .getByTestId("history-refine-bar")
            .getByLabel("Title")
            .fill("evidence");
        await openRefineMultiselect(page, "result");
        await page
            .getByTestId("history-refine-result-option")
            .filter({hasText: "Content download successful"})
            .click();
        await expect(page.getByTestId("history-refine-summary")).toHaveText(
            "2 active filters",
        );
        await page.screenshot({
            path: visualEvidencePath(
                "F-HISTORY-DOWNLOADS",
                "refine-surface-active-desktop",
            ),
        });
        expect(await pageFitsHorizontally(page)).toBe(true);

        await prepareVisualEvidence(page, "mobile", async () => {
            await page.goto("/stats/downloads");
            await dismissWelcomeDialog(page);
            await expect(
                page.getByTestId("history-refine-toggle"),
            ).toBeVisible();
        });
        await expect(page.getByTestId("history-refine-bar")).toHaveCount(0);
        await expect(page.getByTestId("history-refine-toggle")).toHaveAttribute(
            "aria-expanded",
            "false",
        );
        await page.screenshot({
            path: visualEvidencePath(
                "F-HISTORY-DOWNLOADS",
                "refine-surface-drawer-closed-mobile",
            ),
        });

        await page.getByTestId("history-refine-toggle").click();
        await expect(page.getByTestId("history-refine-bar")).toBeVisible();
        await page
            .getByTestId("history-refine-bar")
            .getByLabel("Title")
            .fill("evidence");
        await openRefineMultiselect(page, "result");
        await page
            .getByTestId("history-refine-result-option")
            .filter({hasText: "Content download successful"})
            .click();
        await expect(page.getByTestId("history-refine-toggle")).toContainText(
            "2 active filters",
        );
        await page.screenshot({
            path: visualEvidencePath(
                "F-HISTORY-DOWNLOADS",
                "refine-surface-drawer-open-mobile",
            ),
        });
        expect(await pageFitsHorizontally(page)).toBe(true);
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

// ADR-0029: the page itself never scrolls sideways -- horizontal overflow
// belongs to a table's own `TableScrollAffordance` scroller, never to the
// document.
async function pageFitsHorizontally(
    page: import("@playwright/test").Page,
): Promise<boolean> {
    return page
        .locator("html")
        .evaluate((element) => element.scrollWidth <= element.clientWidth);
}
