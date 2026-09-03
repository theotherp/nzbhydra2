import {dismissWelcomeDialog, expect, test, testEnvironment} from "./fixtures";
import {
    captureVisualRegion,
    expectVisualGeometry,
    prepareVisualEvidence,
    visualViewports,
} from "./visualEvidence";

const movieQuery = "Hydra Browser Movie";

/**
 * FM-087 moved the media refinement, the age/size ranges, and the indexer
 * selection into the Advanced `Collapse`, whose open state is remembered in
 * `localStorage`, so a case that needs those controls opens the disclosure
 * only when it is actually closed.
 */
async function openAdvanced(
    page: import("@playwright/test").Page,
): Promise<void> {
    const toggle = page.getByTestId("search-advanced-toggle");
    if ((await toggle.getAttribute("aria-expanded")) === "false") {
        await toggle.click();
    }
    await expect(page.getByTestId("search-advanced-panel")).toBeVisible();
}

test.describe("Search", () => {
    test.beforeEach(async ({hydra, page}) => {
        await hydra.configureMockIndexers(["1", "2"]);
        // FM-094: these tests run against the React shell now, so they inherit
        // the exposure `results.spec.ts` already documents for FM-091's
        // one-time "Sorting of TV episodes" help dialog: it is keyed by the
        // per-session `isGroupEpisodesHelpShown` flag, an open MUI dialog
        // intercepts pointer events for the rest of the page, and a fresh
        // Playwright context starts without the flag. Raise it here for the
        // same reason that file does -- no test in this file is about that
        // dialog, and `results.spec.ts` owns its dedicated coverage.
        await page.request.put(
            "/internalapi/genericstorage/isGroupEpisodesHelpShown?forUser=true",
            {data: true},
        );
        // React is the served default now, but the navigation stays explicit so
        // every test below states which shell it is about.
        await page.goto("/");
        await dismissWelcomeDialog(page);
        await expect(page.getByTestId("search-query")).toBeVisible();
    });

    // User report (2026-09-03): on an iPhone the page zooms in when the search
    // field is tapped. iOS Safari zooms into any focused input whose computed
    // font-size is under 16px; the theme's `MuiInputBase` answers with 16px
    // under `(pointer: coarse)`. No desktop browser reproduces the zoom
    // itself, so what is pinned is its trigger: the computed size of the
    // query input on a touch device is exactly 16px, and a mouse device keeps
    // the mock's 14px. `hasTouch`/`isMobile` are context options, so the touch
    // half runs in its own context.
    test("should render the query input at 16px on a touch device so iOS does not zoom into it", async ({
        browser,
        page,
    }) => {
        // `search-query` is the `<input>` itself (`slotProps.htmlInput`).
        const inputFontSize = (candidate: import("@playwright/test").Page) =>
            candidate
                .getByTestId("search-query")
                .evaluate((element) => getComputedStyle(element).fontSize);

        expect(await inputFontSize(page)).toBe("14px");

        const context = await browser.newContext({
            baseURL: testEnvironment.playwrightBaseUrl,
            hasTouch: true,
            isMobile: true,
            viewport: visualViewports.mobile,
        });
        try {
            const touchPage = await context.newPage();
            await touchPage.goto("/");
            await dismissWelcomeDialog(touchPage);
            await expect(touchPage.getByTestId("search-query")).toBeVisible();
            expect(await inputFontSize(touchPage)).toBe("16px");
            await touchPage.getByTestId("search-query").tap();
            await expect(touchPage.getByTestId("search-query")).toBeFocused();
            expect(await inputFontSize(touchPage)).toBe("16px");
        } finally {
            await context.close();
        }
    });

    // FM-094: retargeted from the legacy shell with the `beforeEach` above.
    // Everything it pins is about the search and saved-search transport --
    // the request's `searchRequestId`/`loadAll`, the response shape, and the
    // saved-search POST body -- which no React test asserts, so it is kept
    // rather than deleted. Only the results summary changes wording: React
    // renders `search-results-summary` as "N of M loaded" (FM-055's one-phrase
    // format) where legacy wrote "Loaded N ... of M results".
    test("should search configured indexers and render their results", async ({
        page,
    }) => {
        await page.getByTestId("search-query").fill("uitest");
        const searchResponse = page.waitForResponse((response) =>
            isSearchResponse(response),
        );
        await page.getByTestId("search-submit").click();

        const response = await searchResponse;
        expect(response.status()).toBe(200);
        const requestBody = response.request().postDataJSON() as {
            searchRequestId?: unknown;
            loadAll?: unknown;
        };
        expect(typeof requestBody.searchRequestId).toBe("number");
        expect(requestBody.loadAll).toBe(false);
        const body = (await response.json()) as {searchResults?: unknown[]};
        expect(Array.isArray(body.searchResults)).toBe(true);

        await expect(page.getByTestId("search-status-modal")).toBeHidden();
        await expect(page.getByTestId("search-results")).toBeVisible();
        await expect(
            page
                .getByTestId("search-result-title")
                .filter({hasText: "indexer1-result1"}),
        ).toBeVisible();
        await expect(
            page
                .getByTestId("search-result-title")
                .filter({hasText: "indexer2-result1"}),
        ).toBeVisible();
        await expect(page.getByTestId("search-results-summary")).toContainText(
            "5 of 5 loaded",
        );

        const savedSearchResponse = page.waitForResponse(
            (response) =>
                response.request().method() === "POST" &&
                new URL(response.url()).pathname ===
                    "/internalapi/savedsearches",
        );
        await page.locator("#save-search").click();
        const savedSearchBody = (await savedSearchResponse)
            .request()
            .postDataJSON() as {
            request?: {searchRequestId?: unknown; loadAll?: unknown};
        };
        expect(typeof savedSearchBody.request?.searchRequestId).toBe("number");
        expect(savedSearchBody.request?.loadAll).toBe(false);
    });

    // FM-094: the legacy-comparison step this test used to carry -- a visit to
    // the AngularJS saved-searches page asserting the saved entry was listed
    // there too -- is gone with the legacy shell. It compared two shells'
    // rendering of the same record, which stops being a question once one
    // shell remains; the record's own presence, reopening, rerun and deletion
    // are all still asserted here against React.
    test("should save, reopen, rerun, and delete a React saved search", async ({
        page,
    }) => {
        await page.goto("/");
        await expect(page).toHaveURL(/\/$/);
        await page.getByTestId("search-query").fill("saved React criteria");
        const initialSearch = page.waitForResponse((response) =>
            isSearchResponse(response),
        );
        await page.getByTestId("search-submit").click();
        await initialSearch;

        const saveResponse = page.waitForResponse(
            (response) =>
                response.request().method() === "POST" &&
                new URL(response.url()).pathname ===
                    "/internalapi/savedsearches",
        );
        await page.locator("#save-search").click();
        expect((await saveResponse).status()).toBe(200);

        await page.goto("/stats/saved-searches");
        await expect(
            page.getByRole("heading", {name: "Saved searches"}),
        ).toBeVisible();
        await expect(
            page.getByRole("cell", {name: "saved React criteria"}),
        ).toBeVisible();

        await page.getByRole("button", {name: "Search"}).click();
        await expect(page.getByTestId("search-query")).toHaveValue(
            "saved React criteria",
        );
        const rerun = page.waitForResponse((response) =>
            isSearchResponse(response),
        );
        await page.getByTestId("search-submit").click();
        expect((await rerun).request().postDataJSON()).toMatchObject({
            query: "saved React criteria",
        });

        await page.goto("/stats/saved-searches");
        await page.getByRole("button", {name: "Delete"}).click();
        await page
            .getByRole("dialog")
            .getByRole("button", {name: "Delete"})
            .click();
        await expect(page.getByText("saved React criteria")).not.toBeVisible();
    });

    test("should retain Spring stats-role protection for saved-searches", async ({
        hydra,
        page,
    }) => {
        const config = await hydra.getConfig();
        config.auth = {
            authType: "FORM",
            restrictAdmin: true,
            restrictStats: true,
            restrictSearch: false,
            users: [
                {
                    username: "admin",
                    password: "{noop}password",
                    maySeeAdmin: true,
                    maySeeStats: true,
                },
            ],
        };
        await hydra.saveConfig(config);

        const response = await page.request.get("/stats/saved-searches", {
            maxRedirects: 0,
        });
        expect(response.status()).toBe(403);
    });

    test("should render the React search workspace and preserved result selectors at desktop and mobile widths", async ({
        page,
    }) => {
        await page.getByTestId("search-query").fill("uitest");
        await page.getByTestId("search-submit").click();
        await expect(page.getByTestId("search-results")).toBeVisible();
        const selectorCounts = await Promise.all(
            [
                "search-query",
                "search-submit",
                "search-category-control",
                "search-results",
                "search-results-summary",
                "search-results-table",
                "search-result-row",
                "search-result-title",
            ].map((selector) => page.getByTestId(selector).count()),
        );
        await page.goto("/");
        await expect(page).toHaveURL(/\/$/);
        await expect(page.getByTestId("search-query")).toBeVisible();
        await page.getByTestId("search-query").fill("uitest");
        const searchResponse = page.waitForResponse((response) =>
            isSearchResponse(response),
        );
        await page.getByTestId("search-submit").click();
        expect((await searchResponse).status()).toBe(200);
        await expect(page.getByTestId("search-results")).toBeVisible();
        // FM-055: the React summary is one phrase, `{shown} of {loaded}
        // loaded ...`, which is not the wording the legacy shell used.
        await expect(page.getByTestId("search-results-summary")).toContainText(
            "5 of 5 loaded",
        );
        await expect(page.getByTestId("search-results-table")).toBeVisible();
        await expect(
            page.getByTestId("search-result-row").first(),
        ).toBeVisible();
        await expect(
            page.getByTestId("search-result-title").first(),
        ).toBeVisible();
        const reactSelectorCounts = await Promise.all(
            [
                "search-query",
                "search-submit",
                "search-category-control",
                "search-results",
                "search-results-summary",
                "search-results-table",
                "search-result-row",
                "search-result-title",
            ].map((selector) => page.getByTestId(selector).count()),
        );
        expect(reactSelectorCounts.map((count) => count > 0)).toEqual(
            selectorCounts.map((count) => count > 0),
        );
        await page.setViewportSize({width: 390, height: 844});
        expect(
            await page
                .locator("html")
                .evaluate(
                    (element) => element.scrollWidth <= element.clientWidth,
                ),
        ).toBe(true);
    });

    test("should provide deterministic React workspace visual evidence across desktop and mobile", async ({
        hydra,
        page,
    }) => {
        const config = await hydra.getConfig();
        (config.main as Record<string, unknown>).keepHistory = true;
        (config.searching as Record<string, unknown>).historyForSearching = 5;
        await hydra.saveConfig(config);

        for (const [viewport, minimumWidth] of Object.entries({
            desktop: 600,
            mobile: 300,
        }) as Array<[keyof typeof visualViewports, number]>) {
            await prepareVisualEvidence(page, viewport, async () => {
                await page.goto("/");
                await expect(page).toHaveURL(/\/$/);
                await expect(
                    page.getByTestId("search-workspace"),
                ).toBeVisible();
            });
            const workspace = page.getByTestId("search-workspace");
            const primary = page.getByTestId("workspace-primary");
            const ranges = page.getByTestId("workspace-ranges");
            const actions = page.getByTestId("workspace-actions");
            await expectVisualGeometry(page, {
                region: `search-workspace-${viewport}`,
                locator: workspace,
                minimumWidth,
            });
            await expectVisualGeometry(page, {
                region: `search-bar-row-density-${viewport}`,
                locator: primary,
                minimumWidth,
            });
            // The bar tone is painted once by the workspace card itself (the
            // whole form is one `surfaces.bar` surface, zoned by hairlines),
            // so the distinct-from-page-ground probe measures the card, not
            // the now-transparent primary row inside it.
            const [rowBackground, pageBackground] = await Promise.all([
                workspace.evaluate(
                    (element) => getComputedStyle(element).backgroundColor,
                ),
                page
                    .locator("body")
                    .evaluate(
                        (element) => getComputedStyle(element).backgroundColor,
                    ),
            ]);
            expect(rowBackground).not.toBe("rgba(0, 0, 0, 0)");
            expect(rowBackground).not.toBe(pageBackground);
            await captureVisualRegion(
                primary,
                "F-SEARCH-FORM",
                `search-bar-density-${viewport}`,
            );
            await expectVisualGeometry(page, {
                region: `workspace-actions-${viewport}`,
                locator: actions,
                minimumWidth,
            });
            const advancedToggle = page.getByTestId("search-advanced-toggle");
            const advancedPanel = page.getByTestId("search-advanced-panel");
            await expect(advancedToggle).toHaveAttribute(
                "aria-expanded",
                "false",
            );
            await expect(advancedPanel).toBeHidden();
            const collapsedRow = await primary.boundingBox();
            await advancedToggle.click();
            await expect(advancedToggle).toHaveAttribute(
                "aria-expanded",
                "true",
            );
            await expect(advancedPanel).toBeVisible();
            const expandedRow = await primary.boundingBox();
            expect(collapsedRow).not.toBeNull();
            expect(expandedRow).not.toBeNull();
            expect(expandedRow?.height ?? 0).toBeGreaterThan(
                collapsedRow?.height ?? 0,
            );
            await expectVisualGeometry(page, {
                region: `advanced-panel-expanded-${viewport}`,
                locator: ranges,
                minimumWidth: 200,
            });
            for (const label of [
                "Min age",
                "Max age",
                "Min size",
                "Max size",
            ]) {
                const field = page.getByLabel(label);
                await expect(field).toBeVisible();
                expect(
                    await field.evaluate(
                        (element) => element.scrollWidth <= element.clientWidth,
                    ),
                    `${label} must not overflow horizontally`,
                ).toBe(true);
            }
            // FM-087: the indexer selection lives in this same panel now, so
            // it stays open for the indexer geometry below and is closed
            // again afterwards.
            await expectVisualGeometry(page, {
                region: `dropdown-indexers-${viewport}`,
                locator: page.getByRole("combobox", {name: "Indexers"}),
                minimumWidth,
            });
            const indexersRegion = page.getByTestId("workspace-indexers");
            const bulkActionsToggle = page.getByRole("button", {
                name: "More selection options",
            });
            // prettier-ignore
            const [indexersRegionBox, bulkActionsToggleBox] =
                await Promise.all([
                    indexersRegion.boundingBox(),
                    bulkActionsToggle.boundingBox(),
                ]);
            expect(
                indexersRegionBox,
                `bulk-indexer-actions-${viewport} region must have a bounding box`,
            ).not.toBeNull();
            expect(
                bulkActionsToggleBox,
                `bulk-indexer-actions-${viewport} toggle must have a bounding box`,
            ).not.toBeNull();
            if (indexersRegionBox && bulkActionsToggleBox) {
                expect(bulkActionsToggleBox.x).toBeGreaterThanOrEqual(
                    indexersRegionBox.x,
                );
                expect(
                    bulkActionsToggleBox.x + bulkActionsToggleBox.width,
                ).toBeLessThanOrEqual(
                    indexersRegionBox.x + indexersRegionBox.width + 1,
                );
                expect(bulkActionsToggleBox.y).toBeGreaterThanOrEqual(
                    indexersRegionBox.y,
                );
                expect(
                    bulkActionsToggleBox.y + bulkActionsToggleBox.height,
                ).toBeLessThanOrEqual(
                    indexersRegionBox.y + indexersRegionBox.height + 1,
                );
            }
            await bulkActionsToggle.click();
            const bulkActionsMenu = page.getByRole("menu");
            await expect(bulkActionsMenu).toBeVisible();
            await expectVisualGeometry(page, {
                region: `bulk-indexer-actions-menu-${viewport}`,
                locator: bulkActionsMenu,
                minimumWidth: 180,
            });
            await page.keyboard.press("Escape");
            await expect(bulkActionsMenu).toBeHidden();
            await advancedToggle.click();
            await expect(advancedPanel).toBeHidden();
            const category = page.getByTestId("search-category-control");
            const query = page.getByTestId("search-query");
            const [categoryBox, queryBox, submitBox] = await Promise.all([
                category.boundingBox(),
                query.boundingBox(),
                page.getByTestId("search-submit").boundingBox(),
            ]);
            expect(categoryBox).not.toBeNull();
            expect(queryBox).not.toBeNull();
            expect(submitBox).not.toBeNull();
            if (!categoryBox || !queryBox || !submitBox) {
                throw new Error(
                    "Workspace controls require deterministic geometry",
                );
            }
            // The submit button and the query field beside it are one shared
            // control height (`controlHeight` in `core/ui-react/src/app/
            // theme.ts`, 32px). Asserted as agreement with that field rather
            // than as a bare pixel floor: the floor here was `>= 36`, which
            // silently encoded MUI's *default* button height and went stale
            // the moment the application adopted a single stated control
            // height (`c3bb56318`, which took every button, dropdown trigger,
            // select and input to 32px). Equality with the neighbouring field
            // is what this row actually needs to look right, and it cannot go
            // stale the same way.
            expect(submitBox.height).toBeGreaterThanOrEqual(32);
            expect(
                Math.abs(submitBox.height - queryBox.height),
            ).toBeLessThanOrEqual(1);
            // The mock joins the query field and its Search button into one
            // control: the button sits at the field's trailing edge, on the
            // same baseline, rather than in a separate actions row.
            expect(submitBox.x).toBeGreaterThanOrEqual(
                queryBox.x + queryBox.width - 1,
            );
            expect(Math.abs(submitBox.y - queryBox.y)).toBeLessThanOrEqual(4);
            if (viewport === "desktop") {
                expect(
                    Math.abs(categoryBox.y - queryBox.y),
                ).toBeLessThanOrEqual(2);
            } else {
                expect(categoryBox.y).toBeLessThan(queryBox.y);
            }
        }

        await page.setViewportSize(visualViewports.desktop);
        await page.getByTestId("search-query").fill("visual recent history");
        const visualSearch = page.waitForResponse((response) =>
            isSearchResponse(response),
        );
        await page.getByTestId("search-submit").click();
        expect((await visualSearch).status()).toBe(200);
        // Since 0617f05b1 the recent list is fetched only while its menu is
        // open, so the request to wait for is the one the click below
        // issues, not one the submit above would have triggered.
        const recentSearches = page.waitForResponse(
            (response) =>
                new URL(response.url()).pathname ===
                    "/internalapi/history/searches/forsearching" &&
                response.request().method() === "POST",
        );
        await page.getByTestId("recent-searches-trigger").click();
        expect((await recentSearches).status()).toBe(200);
        const historyMenu = page.getByRole("menu", {name: "Recent searches"});
        await expect(historyMenu).toBeVisible();
        await expectVisualGeometry(page, {
            region: "recent-search-menu-desktop",
            locator: historyMenu,
            minimumWidth: 240,
            maximumWidth: visualViewports.desktop.width - 32,
        });
        await expect(
            page.getByTestId("recent-search-entry").first(),
        ).toBeVisible();

        // ADR-0012 / FM-050: the shared discoverability hint is the Menu's
        // last child, rendered once (not per row), below the last entry,
        // with no horizontal overflow of itself, the menu, or the page, at
        // both of this record's contract viewports.
        const keyboardHint = page.getByText(
            "Press Right Arrow on an entry to refill the search form; Left Arrow or Escape returns.",
        );
        await expect(keyboardHint).toHaveCount(1);
        // "Below the last entry" is a DOM-order fact here (a simple
        // top-to-bottom `MenuList`/`List`, no `order`/reversed flex), so
        // proving the hint follows the last `recent-search-entry` in
        // document order is exact and viewport-independent, unlike a
        // bounding-box comparison, which is sensitive to sub-pixel
        // padding/margin rounding.
        const hintFollowsLastEntryInDomOrder = await page.evaluate((text) => {
            const entries = document.querySelectorAll(
                '[data-testid="recent-search-entry"]',
            );
            const lastEntry = entries[entries.length - 1];
            const hint = Array.from(document.querySelectorAll("span, p")).find(
                (element) => element.textContent?.trim() === text,
            );
            return Boolean(
                lastEntry &&
                hint &&
                lastEntry.compareDocumentPosition(hint) &
                    Node.DOCUMENT_POSITION_FOLLOWING,
            );
        }, "Press Right Arrow on an entry to refill the search form; Left Arrow or Escape returns.");
        expect(hintFollowsLastEntryInDomOrder).toBe(true);
        // The Acceptance criterion is explicit: assert computed-style
        // equality of the hint's horizontal padding against the rendered
        // row's, in the browser, rather than restating the `sx` values
        // (`MenuItem`'s literal 16px default plus the row's `pr: 4`
        // override) from source.
        const hintPadding = await page.evaluate((text) => {
            const entries = document.querySelectorAll(
                '[data-testid="recent-search-entry"]',
            );
            const lastEntry = entries[entries.length - 1];
            const hint = Array.from(document.querySelectorAll("span, p")).find(
                (element) => element.textContent?.trim() === text,
            );
            if (!lastEntry || !hint) {
                return null;
            }
            const rowStyle = window.getComputedStyle(lastEntry);
            const hintStyle = window.getComputedStyle(hint);
            return {
                rowPaddingLeft: rowStyle.paddingLeft,
                rowPaddingRight: rowStyle.paddingRight,
                hintPaddingLeft: hintStyle.paddingLeft,
                hintPaddingRight: hintStyle.paddingRight,
            };
        }, "Press Right Arrow on an entry to refill the search form; Left Arrow or Escape returns.");
        expect(hintPadding).not.toBeNull();
        expect(hintPadding?.hintPaddingLeft).toBe(hintPadding?.rowPaddingLeft);
        expect(hintPadding?.hintPaddingRight).toBe(
            hintPadding?.rowPaddingRight,
        );
        await expectVisualGeometry(page, {
            region: "recent-search-keyboard-hint-desktop",
            locator: keyboardHint,
            maximumWidth: visualViewports.desktop.width - 32,
        });
        await captureVisualRegion(
            keyboardHint,
            "F-SEARCH-RECENT",
            "recent-search-keyboard-hint-desktop",
        );

        await page.setViewportSize(visualViewports.mobile);
        await expect(historyMenu).toBeVisible();
        await expectVisualGeometry(page, {
            region: "recent-search-keyboard-hint-mobile",
            locator: keyboardHint,
            maximumWidth: visualViewports.mobile.width - 32,
        });
        await page.setViewportSize(visualViewports.desktop);

        (config.main as Record<string, unknown>).indexerSelectionAsCheckboxes =
            true;
        await hydra.saveConfig(config);
        await page.reload();
        await openAdvanced(page);
        await expect(page.getByRole("checkbox").first()).toBeVisible();
        await expectVisualGeometry(page, {
            region: "checkbox-indexers-desktop",
            locator: page.getByTestId("workspace-indexers"),
            minimumWidth: 600,
        });

        for (const viewport of ["desktop", "mobile"] as const) {
            await prepareVisualEvidence(page, viewport, async () => {
                await page.goto("/");
                await page.getByTestId("search-category-control").click();
                await page.getByTestId("search-category-option-TV").click();
                await openAdvanced(page);
                await expect(page.getByLabel("Season")).toBeVisible();
            });
            await expectVisualGeometry(page, {
                region: `media-refinement-${viewport}`,
                locator: page.getByTestId("workspace-media-refinement"),
                minimumWidth: 180,
            });
            const seasonEpisode = page.getByTestId("season-episode-pair");
            await expectVisualGeometry(page, {
                region: `paired-season-episode-compact-${viewport}`,
                locator: seasonEpisode,
                maximumWidth: 220,
            });
            const [pairBox, refinementFieldBox] = await Promise.all([
                seasonEpisode.boundingBox(),
                page.getByTestId("additional-query").boundingBox(),
            ]);
            expect(pairBox).not.toBeNull();
            expect(refinementFieldBox).not.toBeNull();
            // FM-087's design contract for the Media section: the additional
            // filter is exactly as wide as the Season + Episode pair above
            // it, so the section reads as one aligned block. This replaces
            // the previous "pair narrower than the full-width refinement
            // field" hierarchy check, which described the pre-FM-087 layout
            // where the field spanned the whole form body.
            expect(refinementFieldBox?.width ?? 0).toBeCloseTo(
                pairBox?.width ?? 0,
                0,
            );
            await page.getByLabel("Season").focus();
            await page.keyboard.type("3");
            await page.getByLabel("Episode").focus();
            await page.keyboard.type("4");
            await expect(page.getByLabel("Season")).toHaveValue("3");
            await expect(page.getByLabel("Episode")).toHaveValue("4");
        }
    });

    // FM-087's Visual Gate: the redesigned bar in its three characteristic
    // states, at both contract viewports.
    test("should provide bar-and-chips visual evidence for the redesigned search form", async ({
        page,
    }) => {
        for (const viewport of ["desktop", "mobile"] as const) {
            await prepareVisualEvidence(page, viewport, async () => {
                await page.goto("/");
                await expect(
                    page.getByTestId("search-workspace"),
                ).toBeVisible();
            });
            await page.getByTestId("search-category-control").click();
            await page.getByTestId("search-category-option-TV").click();
            await page.getByTestId("search-query").fill("Example Show");
            await openAdvanced(page);
            await page.getByLabel("Season").fill("1");
            await page.getByLabel("Episode").fill("2");
            await page.getByLabel("Min age").fill("10");
            await page.getByLabel("Max age").fill("100");
            await page.getByLabel("Min size").fill("500");
            await page.getByLabel("Max size").fill("8000");
            await expect(page.getByTestId("search-chips")).toBeVisible();
            await expect(page.getByTestId("search-chip-season")).toHaveText(
                "S 1",
            );
            await expect(page.getByTestId("search-chip-age")).toHaveText(
                "Age 10–100 d",
            );
            await captureVisualRegion(
                page.getByTestId("search-advanced-panel"),
                "F-SEARCH-FORM",
                `advanced-panel-sections-${viewport}`,
            );
            // Collapsed, every constraint set above still reads off the bar.
            await page.getByTestId("search-advanced-toggle").click();
            await expect(
                page.getByTestId("search-advanced-panel"),
            ).toBeHidden();
            await expect(page.getByTestId("search-chip-size")).toBeVisible();
            await captureVisualRegion(
                page.getByTestId("workspace-primary"),
                "F-SEARCH-FORM",
                `bar-with-chips-collapsed-${viewport}`,
            );

            // The empty-indexer-selection state: a warning chip beside the
            // Alert the form already showed.
            await openAdvanced(page);
            // prettier-ignore
            await page.getByRole("button", {name: "More selection options"}).click();
            await page.getByRole("menuitem", {name: "Deselect all"}).click();
            await page.getByTestId("search-advanced-toggle").click();
            const indexersChip = page.getByTestId("search-chip-indexers");
            await expect(indexersChip).toHaveText("Indexers 0/2");
            await expect(indexersChip).toHaveClass(/MuiChip-colorWarning/);
            await captureVisualRegion(
                page.getByTestId("search-workspace"),
                "F-SEARCH-INDEXERS",
                `empty-indexer-selection-chip-${viewport}`,
            );
        }
    });

    // FM-146 (owner revision of FM-143's same-day rule): the chips row is
    // now omitted while Advanced is collapsed and no constraint is set, so
    // the initial form has no empty band below the input row and the footer
    // sits directly under it. `search-chips` must not exist at all (not just
    // be empty), and the gap from the input row's bottom edge to the
    // footer's top edge must be the fixed chrome only -- comfortably under
    // the 32px `chipsRowMinHeight` reserved once Advanced opens or a
    // constraint is set.
    test("should hide the chips row and close the gap on the collapsed, empty form (FM-146)", async ({
        page,
    }) => {
        await expect(
            page.getByTestId("search-advanced-toggle"),
        ).toHaveAttribute("aria-expanded", "false");
        await expect(page.getByTestId("search-chips")).toHaveCount(0);

        const primaryBox = await page
            .getByTestId("workspace-primary")
            .boundingBox();
        const actionsBox = await page
            .getByTestId("workspace-actions")
            .boundingBox();
        expect(primaryBox).not.toBeNull();
        expect(actionsBox).not.toBeNull();
        if (primaryBox && actionsBox) {
            const gap = actionsBox.y - (primaryBox.y + primaryBox.height);
            expect(gap).toBeLessThan(32);
        }
    });

    // FM-143: the chips row's space is always reserved, so the first chip
    // appearing (and the last one disappearing) must move nothing below it.
    // Advanced is opened and left open for the whole test -- the open/close
    // movement of the panel's `Collapse` and of the chips row's own one
    // (FM-149) is a deliberate, separate animation and must not be captured
    // here, so every box below is read once both have come to rest. The
    // Advanced panel's own top edge is measured
    // (not `workspace-actions`, further down): it sits immediately below the
    // chips row, so its y is affected only by the primary row and the chips
    // row above it -- not by anything that shifts height inside the panel
    // itself (a focused field's adornment, an indexer-selection reflow),
    // which would otherwise be misattributed to the chips row. This
    // reservation now applies only while Advanced is open or a constraint
    // is set (FM-146's `advancedOpen || hasChips` revision); this test keeps
    // Advanced open throughout, so the row it exercises is unaffected.
    test("should not shift the layout below the chips row when the first chip appears or the last one disappears (FM-143)", async ({
        page,
    }) => {
        await openAdvanced(page);
        const advancedPanel = page.getByTestId("search-advanced-panel");
        const minAge = page.getByLabel("Min age");
        const ageChip = page.getByTestId("search-chip-age");

        await expect(page.getByTestId("search-chips")).toBeVisible();
        // FM-149: the row's space now animates open with the panel, so the
        // baseline must be taken at rest -- `toBeVisible()` resolves on the
        // first frame of that shared motion, where every y below is still
        // travelling. Both `Collapse`s reach the `entered` state (height
        // `auto`, transition finished) only once the motion has ended, which
        // is exactly the moment this test's "nothing moves" comparison is
        // about; the comparison itself is unchanged.
        await expect(
            page.locator('.MuiCollapse-root:has([data-testid="search-chips"])'),
        ).toHaveClass(/MuiCollapse-entered/);
        await expect(advancedPanel).toHaveClass(/MuiCollapse-entered/);
        await expect(ageChip).not.toBeVisible();
        const beforeBox = await advancedPanel.boundingBox();
        expect(beforeBox).not.toBeNull();

        await minAge.fill("10");
        await expect(ageChip).toBeVisible();
        const withChipBox = await advancedPanel.boundingBox();
        expect(withChipBox).not.toBeNull();
        expect(withChipBox?.y).toBe(beforeBox?.y);

        await minAge.fill("");
        await expect(ageChip).not.toBeVisible();
        const afterBox = await advancedPanel.boundingBox();
        expect(afterBox).not.toBeNull();
        expect(afterBox?.y).toBe(beforeBox?.y);
    });

    test("should render deterministic STOMP progress in the React search modal", async ({
        page,
    }) => {
        await prepareVisualEvidence(page, "desktop", async () => {
            await page.goto("/");
            await expect(page).toHaveURL(/\/$/);
        });
        const enableDemo = await page.request.put("/internalapi/demomode");
        expect(enableDemo.status()).toBe(200);
        try {
            await page
                .getByTestId("search-query")
                .fill("deterministic progress");
            await page.getByTestId("search-submit").click();
            const modal = page.getByTestId("search-status-modal");
            await expect(modal).toBeVisible();
            await expect(modal).toContainText("DemoIndexer1 returned results");
            await expect(modal).toContainText("Indexers finished: 1 / 3");

            // FM-083: the Cancel button sits alongside "Show early results"
            // -- the two-button layout the Visual Gate screenshot strip
            // below captures. Demo mode's "returned results" message doesn't
            // match the positive-count marker `hasResults` looks for
            // (`searchState.ts`), so "Show early results" stays disabled
            // here; that gate is exercised with real result counts in
            // "should show scoped progress, offer early results..." (unit
            // test) and doesn't need duplicating against the real backend.
            const cancelButton = page.getByRole("button", {
                name: "Cancel search and return to search mask",
            });
            const earlyResultsButton = page.getByRole("button", {
                name: "Show early results",
            });
            await expect(cancelButton).toBeEnabled();
            await expect(earlyResultsButton).toBeVisible();
            await captureVisualRegion(
                modal,
                "F-SEARCH-PROGRESS",
                "search-progress-modal-both-buttons-desktop",
            );
        } finally {
            const disableDemo = await page.request.delete(
                "/internalapi/demomode",
            );
            expect(disableDemo.status()).toBe(200);
        }
    });

    test("should cancel a real search while the progress dialog is open and return to the empty search form (FM-083)", async ({
        page,
    }) => {
        await page.goto("/");
        await expect(page).toHaveURL(/\/$/);

        // Route-delay the real search request so the progress dialog stays
        // open long enough to click Cancel before the mock indexers'
        // response ever arrives -- no server-side cancellation is sent
        // (legacy parity, F-SEARCH-PROGRESS gap); the client simply abandons
        // the still-in-flight request.
        await page.route("**/internalapi/search", async (route) => {
            await new Promise((resolve) => setTimeout(resolve, 3000));
            await route.continue();
        });

        const query = "fm083 cancel while searching";
        await page.getByTestId("search-query").fill(query);
        await page.getByTestId("search-submit").click();

        const modal = page.getByTestId("search-status-modal");
        await expect(modal).toBeVisible();
        await page
            .getByRole("button", {
                name: "Cancel search and return to search mask",
            })
            .click();

        await expect(modal).toBeHidden();
        await expect(page.getByTestId("search-query")).toHaveValue(query);
        await expect(page.getByTestId("search-results")).toHaveCount(0);
        await expect(page.getByRole("alert")).toHaveCount(0);

        // The abandoned request eventually completes server-side (the
        // backend keeps searching); prove its late arrival changes nothing
        // on screen.
        await page.waitForTimeout(3500);
        await expect(modal).toBeHidden();
        await expect(page.getByTestId("search-results")).toHaveCount(0);
        await expect(page.getByRole("alert")).toHaveCount(0);
    });

    test("should submit the explicit React indexer selection in both presentations", async ({
        hydra,
        page,
    }) => {
        const config = await hydra.getConfig();
        const indexers = config.indexers as Array<Record<string, unknown>>;
        indexers[0].preselect = true;
        indexers[0].groupNames = ["Primary"];
        indexers[1].preselect = false;
        indexers[1].groupNames = ["Secondary"];
        const main = config.main as Record<string, unknown>;
        await hydra.saveConfig(config);

        await page.goto("/");
        await expect(page).toHaveURL(/\/$/);
        await openAdvanced(page);
        const indexerSelect = page.getByRole("combobox", {name: "Indexers"});
        await indexerSelect.click();
        await page.getByRole("option", {name: "Mock1"}).click();
        await page.getByRole("option", {name: "Mock2"}).click();
        await page.keyboard.press("Escape");
        const dropdownRequest = page.waitForResponse((response) =>
            isSearchResponse(response),
        );
        await page.getByTestId("search-submit").click();
        expect((await dropdownRequest).request().postDataJSON()).toMatchObject({
            indexers: ["Mock2"],
        });

        main.indexerSelectionAsCheckboxes = true;
        await hydra.saveConfig(config);
        await page.reload();
        await openAdvanced(page);
        await expect(
            page.getByRole("checkbox", {name: "Mock1"}),
        ).not.toBeChecked();
        // prettier-ignore
        await page.getByRole("button", {name: "More selection options"}).click();
        await page.getByRole("menuitem", {name: "Deselect all"}).click();
        // prettier-ignore
        await page.getByRole("button", {name: "More selection options"}).click();
        await page
            .getByRole("menuitem", {name: "Select group Secondary"})
            .click();
        const checkboxRequest = page.waitForResponse((response) =>
            isSearchResponse(response),
        );
        await page.getByTestId("search-submit").click();
        expect((await checkboxRequest).request().postDataJSON()).toMatchObject({
            indexers: ["Mock2"],
        });
    });

    test("should refill and repeat complete recent React search criteria", async ({
        hydra,
        page,
    }) => {
        const config = await hydra.getConfig();
        (config.main as Record<string, unknown>).keepHistory = true;
        (config.searching as Record<string, unknown>).historyForSearching = 5;
        await hydra.saveConfig(config);
        await page.goto("/");
        await expect(page).toHaveURL(/\/$/);
        // FM-044 relocated the age/size ranges into the collapsed `Advanced`
        // disclosure and FM-087 moved the indexer selection in beside them;
        // the criteria, their bindings, and the indexer semantics are
        // unchanged, so only the disclosure has to be opened first.
        await openAdvanced(page);
        await page.getByRole("combobox", {name: "Indexers"}).click();
        await page.getByRole("option", {name: "Mock1"}).click();
        await page.keyboard.press("Escape");
        await page.getByTestId("search-query").fill("recent criteria");
        await page.getByLabel("Min age").fill("2");
        await page.getByLabel("Max size").fill("50");
        const firstSearch = page.waitForResponse((response) =>
            isSearchResponse(response),
        );
        await page.getByTestId("search-submit").click();
        expect((await firstSearch).request().postDataJSON()).toMatchObject({
            minage: 2,
            maxsize: 50,
            indexers: ["Mock2"],
        });
        // Since 0617f05b1 the recent list is fetched on open, not on page
        // load: this click is what issues the request the refill reads.
        const recentSearches = page.waitForResponse(
            (response) =>
                response.request().method() === "POST" &&
                new URL(response.url()).pathname ===
                    "/internalapi/history/searches/forsearching",
        );
        await page.getByTestId("recent-searches-trigger").click();
        expect((await recentSearches).status()).toBe(200);
        await expect(
            page.getByText(/Query: recent criteria/).first(),
        ).toBeVisible();
        await expect(
            page.getByRole("button", {name: /^Refill:/}).first(),
        ).toBeVisible();
        // prettier-ignore
        await page.getByRole("button", {name: /^Refill:/}).first().click();
        // Refilling remounts the workspace; the disclosure holding the
        // refilled ranges reopens from its remembered state (FM-087).
        await openAdvanced(page);
        await expect(page.getByLabel("Min age")).toHaveValue("2");
        await expect(page.getByLabel("Max size")).toHaveValue("50");
        await page.getByTestId("recent-searches-trigger").click();
        const repeatedSearch = page.waitForResponse((response) =>
            isSearchResponse(response),
        );
        await page.getByRole("menuitem", {name: "Repeat"}).first().click();
        expect((await repeatedSearch).request().postDataJSON()).toMatchObject({
            query: "recent criteria",
            minage: 2,
            maxsize: 50,
            indexers: ["Mock2"],
        });
    });

    test("should reach, return from, and activate Refill by keyboard alone via ArrowRight/ArrowLeft/Escape/Enter/Space (ADR-0012)", async ({
        hydra,
        page,
    }) => {
        const config = await hydra.getConfig();
        (config.main as Record<string, unknown>).keepHistory = true;
        // Caps `History.getHistoryForSearching` (ordered `time desc`,
        // deduplicated by `comparingHash`) at exactly the two most recent,
        // distinctly-named searches below -- a deterministic two-entry
        // fixture regardless of any history left by earlier tests in this
        // file.
        (config.searching as Record<string, unknown>).historyForSearching = 2;
        await hydra.saveConfig(config);

        const alphaQuery = "fm050 keyboard refill alpha";
        const betaQuery = "fm050 keyboard refill beta";

        await page.goto("/");
        await expect(page).toHaveURL(/\/$/);
        const firstSubmission = page.waitForResponse((response) =>
            isSearchResponse(response),
        );
        await page.getByTestId("search-query").fill(alphaQuery);
        await page.getByTestId("search-submit").click();
        expect((await firstSubmission).status()).toBe(200);

        // FM-051 fixed the defect (recorded under FM-049's Follow-Up Work)
        // that made a second plain-text search submitted without an
        // intervening navigation silently reuse the first search's query
        // text -- see "should submit each of two consecutive plain-text
        // searches..." below for that regression coverage. The `page.goto`
        // below is kept anyway: FM-050's recorded verification basis for
        // this fixture's keyboard-navigation trace was established with
        // this navigation in place, and this task does not re-open that
        // evidence.
        await page.goto("/");
        await expect(page).toHaveURL(/\/$/);
        const secondSubmission = page.waitForResponse((response) =>
            isSearchResponse(response),
        );
        await page.getByTestId("search-query").fill(betaQuery);
        await page.getByTestId("search-submit").click();
        expect((await secondSubmission).status()).toBe(200);

        // Refill must never issue a search; Repeat always does. Counting
        // every `/internalapi/search` POST from here on is the
        // discriminating measurement for every activation below.
        let searchRequestCount = 0;
        page.on("request", (request) => {
            if (
                request.method() === "POST" &&
                new URL(request.url()).pathname === "/internalapi/search"
            ) {
                searchRequestCount += 1;
            }
        });

        const menu = page.getByRole("menu", {name: "Recent searches"});
        const trigger = page.getByTestId("recent-searches-trigger");
        const betaRow = page.getByRole("menuitem", {
            name: new RegExp(`Repeat:.*${betaQuery}`),
        });
        const alphaRow = page.getByRole("menuitem", {
            name: new RegExp(`Repeat:.*${alphaQuery}`),
        });
        const betaRefill = page.getByRole("button", {
            name: new RegExp(`Refill:.*${betaQuery}`),
        });
        const alphaRefill = page.getByRole("button", {
            name: new RegExp(`Refill:.*${alphaQuery}`),
        });

        async function openMenuByKeyboard(): Promise<void> {
            // Idempotent regardless of prior state: `Tab` unconditionally
            // closes the menu and returns focus to the trigger from either
            // focus position (`Menu.js`'s `handleListKeyDown` intercepts
            // `Tab` before `currentFocus` is ever consulted), which matters
            // here because some blocks below deliberately leave the menu
            // open (e.g. after `Escape` from the button) before the next
            // block reopens it.
            if (await menu.isVisible()) {
                await page.keyboard.press("Tab");
                await expect(menu).toBeHidden();
            }
            await trigger.focus();
            await page.keyboard.press("Enter");
            await expect(menu).toBeVisible();
        }

        type TraceEntry = {
            key: string;
            tag: string;
            name: string | null;
            testId: string | null;
            menuOpen: boolean;
        };
        const trace: TraceEntry[] = [];
        async function record(label: string): Promise<void> {
            const info = await page.evaluate(() => {
                const active = document.activeElement as HTMLElement | null;
                return {
                    tag: active ? active.tagName : "(none)",
                    name: active ? active.getAttribute("aria-label") : null,
                    testId: active ? active.getAttribute("data-testid") : null,
                };
            });
            trace.push({
                key: label,
                ...info,
                menuOpen: await menu.isVisible(),
            });
        }

        // Open by keyboard: focus the trigger (as tabbing to it would leave
        // it), then Enter. MUI's `MenuList` `activeItemIndex` lookahead
        // autofocuses the first entry, which -- given `time desc` ordering
        // and the two-entry cap above -- is beta, the more recently
        // submitted search.
        await openMenuByKeyboard();
        await expect(betaRow).toBeFocused();
        await record("(open by keyboard) focus trigger, Enter");

        // ArrowLeft on a row is a no-op (neither MUI handler consumes it).
        await page.keyboard.press("ArrowLeft");
        await expect(betaRow).toBeFocused();
        await expect(menu).toBeVisible();
        await record("ArrowLeft (from row)");

        // ArrowRight moves focus onto the row's Refill button; menu stays
        // open; no search is issued.
        const beforeArrowRight = searchRequestCount;
        await page.keyboard.press("ArrowRight");
        await expect(betaRefill).toBeFocused();
        await expect(menu).toBeVisible();
        expect(searchRequestCount).toBe(beforeArrowRight);
        await record("ArrowRight (from row)");

        // The button shows a real focus indicator when reached: it matches
        // `:focus-visible` -- Chromium's genuine keyboard-focus heuristic,
        // not merely `document.activeElement`. `app/theme.ts`'s
        // `MuiCssBaseline` override sets `outline: 3px solid currentColor`
        // at `outlineOffset: 3px` on `:focus-visible` globally, and
        // `outlineOffset` does reach this element (confirmed below), but
        // `outline-style`/`outline-width` do not: `@mui/material` `7.3.9`'s
        // `ButtonBase/ButtonBase.js` gives every `ButtonBase`-derived root
        // (`Button`, `IconButton`, `ListItemButton`, ...) its own
        // unconditional `outline: 0`, generated as a higher-specificity
        // compound class that wins the cascade over the single-class
        // `:focus-visible` global rule for the `outline` shorthand
        // (`outline-style`/`outline-width`) -- verified directly against
        // both this button and an unrelated, pre-existing nav
        // `ListItemButton`, so this is an app-wide `ButtonBase` property,
        // not something FM-050 introduced or can fix here (`app/theme.ts`
        // is outside this task's `Files Allowed To Modify`). Recorded as a
        // maintenance candidate under Follow-Up Work.
        const focusIndicator = await page.evaluate(() => {
            const active = document.activeElement as HTMLElement;
            const style = window.getComputedStyle(active);
            return {
                matchesFocusVisible: active.matches(":focus-visible"),
                outlineOffset: style.outlineOffset,
            };
        });
        expect(focusIndicator.matchesFocusVisible).toBe(true);
        expect(focusIndicator.outlineOffset).toBe("3px");

        // `matchesFocusVisible`/`outlineOffset` above hold regardless of
        // whether anything is actually painted -- `outlineOffset` still
        // computes to `3px` even with `outline-style: none`. The real,
        // app-wide mechanism `@mui/material` `7.3.9` substitutes for the
        // suppressed CSS outline is `ButtonBase/ButtonBase.js`'s pulsating
        // `TouchRipple`: its `useEffect` calls `ripple.pulsate()` whenever
        // `focusVisible && focusRipple` (both true here -- `IconButton`
        // passes `focusRipple: !disableFocusRipple`, which defaults
        // `true`), mounting a `.MuiTouchRipple-ripplePulsate` span with
        // `opacity: 0.3` and a `.MuiTouchRipple-child` with
        // `background-color: currentColor`, unconditionally on that class
        // (not gated behind a CSS transition's enter/active staging, per
        // `Ripple.js`). `Button.js`'s own prop doc for `disableRipple`
        // records the mechanism: "Without a ripple there is no styling for
        // :focus-visible by default." This is weak (0.3 opacity, easy to
        // miss in a static capture) but real and it predates FM-050; it
        // gives this assertion the regression value the two above cannot --
        // it would catch a future `disableRipple`/`disableFocusRipple` that
        // silently removed even this indicator.
        const focusPulsate = betaRefill.locator(
            ".MuiTouchRipple-ripplePulsate",
        );
        await expect(focusPulsate).toBeAttached();
        const pulsateOpacity = await focusPulsate.evaluate(
            (element) => window.getComputedStyle(element).opacity,
        );
        expect(Number(pulsateOpacity)).toBeGreaterThan(0);

        // ArrowLeft returns focus to the owning row; menu stays open.
        await page.keyboard.press("ArrowLeft");
        await expect(betaRow).toBeFocused();
        await expect(menu).toBeVisible();
        await record("ArrowLeft (from button)");

        // ArrowRight then Escape returns focus to the row and must NOT
        // close the menu -- the regression risk this packet names.
        await page.keyboard.press("ArrowRight");
        await expect(betaRefill).toBeFocused();
        await page.keyboard.press("Escape");
        await expect(betaRow).toBeFocused();
        await expect(menu).toBeVisible();
        await record("ArrowRight, Escape (from button)");

        // Regression check in the other direction: Escape on a row still
        // closes the menu, unchanged.
        await page.keyboard.press("Escape");
        await expect(menu).toBeHidden();
        await record("Escape (from row)");

        // ArrowRight is a no-op from the button -- there is no second
        // target.
        await openMenuByKeyboard();
        await page.keyboard.press("ArrowRight");
        await expect(betaRefill).toBeFocused();
        await page.keyboard.press("ArrowRight");
        await expect(betaRefill).toBeFocused();
        await expect(menu).toBeVisible();
        await record("ArrowRight, ArrowRight (from button)");
        await page.keyboard.press("Escape");
        await expect(menu).toBeVisible();

        // ArrowDown from the button reaches the same row ArrowDown reaches
        // from the row (committed equivalence assertion).
        await openMenuByKeyboard();
        await page.keyboard.press("ArrowDown");
        await expect(alphaRow).toBeFocused();
        await record("ArrowDown (from row, baseline)");

        await openMenuByKeyboard();
        await page.keyboard.press("ArrowRight");
        await expect(betaRefill).toBeFocused();
        await page.keyboard.press("ArrowDown");
        await expect(alphaRow).toBeFocused();
        await expect(menu).toBeVisible();
        await record("ArrowDown (from button)");

        // ArrowUp from the button reaches the same row ArrowUp reaches from
        // the row (wraps from the first/autofocused row -- beta -- to the
        // last -- alpha).
        await openMenuByKeyboard();
        await page.keyboard.press("ArrowUp");
        await expect(alphaRow).toBeFocused();
        await record("ArrowUp (from row, baseline)");

        await openMenuByKeyboard();
        await page.keyboard.press("ArrowRight");
        await expect(betaRefill).toBeFocused();
        await page.keyboard.press("ArrowUp");
        await expect(alphaRow).toBeFocused();
        await expect(menu).toBeVisible();
        await record("ArrowUp (from button)");

        // Home from the button reaches the same row Home reaches from the
        // row (moved off the first row first, so Home demonstrably moves
        // focus rather than being a no-op).
        await openMenuByKeyboard();
        await page.keyboard.press("ArrowDown");
        await expect(alphaRow).toBeFocused();
        await page.keyboard.press("Home");
        await expect(betaRow).toBeFocused();
        await record("Home (from row, baseline)");

        await openMenuByKeyboard();
        await page.keyboard.press("ArrowDown");
        await expect(alphaRow).toBeFocused();
        await page.keyboard.press("ArrowRight");
        await expect(alphaRefill).toBeFocused();
        await page.keyboard.press("Home");
        await expect(betaRow).toBeFocused();
        await expect(menu).toBeVisible();
        await record("Home (from button)");

        // End from the button reaches the same row End reaches from the
        // row.
        await openMenuByKeyboard();
        await page.keyboard.press("End");
        await expect(alphaRow).toBeFocused();
        await record("End (from row, baseline)");

        await openMenuByKeyboard();
        await page.keyboard.press("ArrowRight");
        await expect(betaRefill).toBeFocused();
        await page.keyboard.press("End");
        await expect(alphaRow).toBeFocused();
        await expect(menu).toBeVisible();
        await record("End (from button)");

        // Recorded, not asserted, per this packet's Acceptance: type-ahead
        // does not discriminate (every row's accessible name starts with
        // "Repeat: ", and MUI's own type-ahead matches visible `innerText`,
        // not the `aria-label`) and is timing-sensitive (`MenuList`'s 500ms
        // `criteria` reset).
        await page.keyboard.press("ArrowRight");
        await expect(alphaRefill).toBeFocused();
        await page.keyboard.press("f");
        await record("f (type-ahead, from button)");
        if (!(await menu.isVisible())) {
            await openMenuByKeyboard();
        }

        // Tab/Shift+Tab from the button close the menu and return focus to
        // the trigger, exactly as from a row (`Menu.js`'s
        // `handleListKeyDown` intercepts `Tab` unconditionally, before
        // `currentFocus` is ever consulted).
        await page.keyboard.press("ArrowRight");
        await page.keyboard.press("Tab");
        await expect(menu).toBeHidden();
        await expect(trigger).toBeFocused();
        await record("Tab (from button)");

        await openMenuByKeyboard();
        await page.keyboard.press("ArrowRight");
        await page.keyboard.press("Shift+Tab");
        await expect(menu).toBeHidden();
        await expect(trigger).toBeFocused();
        await record("Shift+Tab (from button)");

        // Enter activates the button natively: the form is refilled, the
        // menu closes, and no search request is issued -- the
        // discriminating assertion, since Repeat issues one and Refill must
        // not.
        await openMenuByKeyboard();
        await expect(betaRow).toBeFocused();
        await page.keyboard.press("ArrowRight");
        await expect(betaRefill).toBeFocused();
        const beforeEnter = searchRequestCount;
        await page.keyboard.press("Enter");
        await expect(menu).toBeHidden();
        await expect(page.getByTestId("search-query")).toHaveValue(betaQuery);
        expect(searchRequestCount).toBe(beforeEnter);
        await record("Enter (from button)");

        // Space activates the button natively, same discriminating
        // assertion, exercised from the other row for coverage variety.
        await openMenuByKeyboard();
        await page.keyboard.press("ArrowDown");
        await expect(alphaRow).toBeFocused();
        await page.keyboard.press("ArrowRight");
        await expect(alphaRefill).toBeFocused();
        const beforeSpace = searchRequestCount;
        await page.keyboard.press("Space");
        await expect(menu).toBeHidden();
        await expect(page.getByTestId("search-query")).toHaveValue(alphaQuery);
        expect(searchRequestCount).toBe(beforeSpace);
        await record("Space (from button)");

        // The full trace is the deliverable this packet requires; attach it
        // to the report so it is durable evidence, not just a console log.
        await test.info().attach("keyboard-refill-focus-trace", {
            body: JSON.stringify(trace, null, 2),
            contentType: "application/json",
        });
    });

    test("should submit each of two consecutive plain-text searches with its own query text, not the first search's stale text (FM-051)", async ({
        page,
    }) => {
        const firstQuery = "fm051 first query alpha";
        const secondQuery = "fm051 second query beta";

        // This defect exists only in `SearchWorkspace.tsx`/`SearchPage.tsx` --
        // legacy's `getSearchQuery()` already had no fallback chain -- so the
        // shell is named at the point of navigation. FM-094 repointed the
        // shared `beforeEach` at the same entry point, which used to reach the
        // legacy shell through a bare `page.goto("/")`.
        await page.goto("/");
        await expect(page).toHaveURL(/\/$/);
        await expect(page.getByTestId("search-query")).toBeVisible();

        // Match on request *content*, never on how many `/internalapi/
        // search` POSTs occur: fixing this defect makes `AutoSubmitFromRoute`
        // genuinely re-fire once the URL genuinely changes on submit (see
        // this task's Out Of Scope), so a count-based wait would be racy.
        const firstSubmission = page.waitForResponse(
            (response) =>
                isSearchResponse(response) &&
                (response.request().postDataJSON() as {query?: string})
                    .query === firstQuery,
        );
        await page.getByTestId("search-query").fill(firstQuery);
        await page.getByTestId("search-submit").click();
        expect((await firstSubmission).status()).toBe(200);
        expect(new URL(page.url()).searchParams.get("query")).toBe(firstQuery);

        // No intervening `page.goto`: this is the exact FM-051 regression.
        // Replacing the box's text and submitting again, in the same
        // session, must send and navigate to the second search's own text
        // -- not silently resubmit the first search's.
        const secondSubmission = page.waitForResponse(
            (response) =>
                isSearchResponse(response) &&
                (response.request().postDataJSON() as {query?: string})
                    .query === secondQuery,
        );
        await page.getByTestId("search-query").fill(secondQuery);
        await page.getByTestId("search-submit").click();
        const response = await secondSubmission;
        expect(response.status()).toBe(200);
        expect(response.request().postDataJSON()).toMatchObject({
            query: secondQuery,
        });
        expect(new URL(page.url()).searchParams.get("query")).toBe(secondQuery);
        await expect(page.getByTestId("search-query")).toHaveValue(secondQuery);
    });

    // FM-094: retargeted from the legacy shell with the `beforeEach` above.
    // `indexer-limit-warnings` is a surface both shells render and no React
    // test covers it, so the test is kept rather than deleted.
    test("should warn when indexer API hit or download limits are nearly exhausted", async ({
        hydra,
        page,
    }) => {
        const config = await hydra.getConfig();
        const indexers = config.indexers as Array<Record<string, unknown>>;
        const notificationConfig = config.notificationConfig as Record<
            string,
            unknown
        >;
        notificationConfig.indexerHitLimitWarningThreshold = 100;
        notificationConfig.indexerDownloadLimitWarningThreshold = 100;
        for (const indexer of indexers) {
            indexer.hitLimit = 100;
            indexer.downloadLimit = 100;
        }
        await hydra.saveConfig(config);

        await page.getByTestId("search-query").fill("uitest");
        await page.getByTestId("search-submit").click();

        const warnings = page.getByTestId("indexer-limit-warnings");
        await expect(warnings).toBeVisible();
        await expect(warnings).toContainText(/Mock1 has \d+ API hits left\./);
        await expect(warnings).toContainText(/Mock1 has \d+ downloads left\./);
        await expect(warnings).toContainText(/Mock2 has \d+ API hits left\./);
        await expect(warnings).toContainText(/Mock2 has \d+ downloads left\./);
    });

    // FM-094: three legacy-shell tests stood here and are disposed of as
    // follows.
    //
    // "should preselect configured source quick filters" is deleted: its rule
    // -- a quick filter named in `preselectQuickFilterButtons` comes up
    // pressed and already filtering -- is asserted against React by
    // `results.spec.ts`'s "should sort every column and filter deterministic
    // React results", which preselects one button from each of the four
    // families (source, quality, other, custom), asserts all four are
    // `aria-pressed`, and asserts the single title they leave standing.
    //
    // "should apply later quick filters after deselecting quality and other
    // filters" is kept but moved to `results.spec.ts` next to the other
    // retargeted quick-filter test, because under ADR-0009 the quick filters
    // are part of the refine sidebar and that file owns the sidebar's
    // helpers. Its rule -- deselecting one family's filter leaves the
    // remaining families still filtering -- has no other coverage.
    //
    // "should select a movie autocomplete result and search by TMDB
    // identifier" is deleted: the React test directly below drives the same
    // real-backend MOVIE autocomplete, the same `data-tmdb-id` option, the
    // same `additional-query` reveal and the same `"tmdbId":"424242"` search
    // body, and additionally pins the backend's explicit-null serialization.
    // Its one assertion the React sibling did not make -- that the identifier
    // search really renders the movie -- is carried over below now that the
    // size constraint a cleared field expresses actually reaches the request.

    test("should select a movie autocomplete result through the React route and search by TMDB identifier", async ({
        page,
    }) => {
        await page.goto("/");
        await expect(page).toHaveURL(/\/$/);
        await page.getByTestId("search-category-control").click();
        await page.getByTestId("search-category-option-Movies").click();
        // The Movies category's 500-20000 MB preset would reject this
        // deterministic 12 KB result, so the search this test asserts on is
        // only reachable by clearing the size range first -- exactly what
        // the deleted legacy test did through `#minsize`/`#maxsize`.
        await openAdvanced(page);
        await page.getByLabel("Min size").fill("");
        await page.getByLabel("Max size").fill("");
        await expect(page.getByTestId("search-chip-size")).toBeHidden();

        const searchQuery = page.getByTestId("search-query");
        const autocompleteResponse = page.waitForResponse(
            (response) =>
                response.request().method() === "GET" &&
                new URL(response.url()).pathname ===
                    "/internalapi/autocomplete/MOVIE",
        );
        await searchQuery.fill(movieQuery);

        const response = await autocompleteResponse;
        expect(response.status()).toBe(200);
        const autocomplete = (await response.json()) as Array<
            Record<string, unknown>
        >;
        // prettier-ignore
        const match = autocomplete.find(
            (entry) => entry.tmdbId === "424242",
        );
        expect(match).toBeDefined();
        // Confirms this test exercises the real backend's explicit-null
        // serialization of absent optional fields, not a coincidentally
        // complete payload.
        expect(match).toMatchObject({
            imdbId: null,
            tvmazeId: null,
            tvrageId: null,
            tvdbId: null,
            posterUrl: null,
        });

        const movieOption = page.locator(
            '[data-testid="autocomplete-option"][data-tmdb-id="424242"]',
        );
        await expect(movieOption).toBeVisible();
        await movieOption.click();
        await expect(searchQuery).toHaveValue(movieQuery);
        await expect(page.getByTestId("additional-query")).toBeVisible();

        const searchResponse = page.waitForResponse((response) =>
            isSearchResponse(response),
        );
        await page.getByTestId("search-submit").click();
        const searchRequest = (await searchResponse).request();
        expect(searchRequest.postData()).toContain('"tmdbId":"424242"');
        // The cleared range must reach the backend as "no constraint", not as
        // the category preset -- that is what lets the 12 KB result below
        // through, and it is the regression this assertion pins.
        const body = searchRequest.postDataJSON() as Record<string, unknown>;
        expect(body.minsize).toBeUndefined();
        expect(body.maxsize).toBeUndefined();

        await expect(page.getByTestId("search-status-modal")).toBeHidden();
        await expect(
            page
                .getByTestId("search-result-title")
                .filter({hasText: "Hydra Downloader Integration Movie"}),
        ).toBeVisible();
    });

    test("should select a TV autocomplete result with the keyboard and search by TVDB identifier", async ({
        page,
    }) => {
        await page.goto("/");
        await expect(page).toHaveURL(/\/$/);
        await page.getByTestId("search-category-control").click();
        await page.getByTestId("search-category-option-TV").click();
        await page.route(
            "**/internalapi/autocomplete/TV?input=Hydra+TV",
            (route) =>
                route.fulfill({
                    json: [{title: "Hydra TV", tvdbId: "31337"}],
                }),
        );
        const searchQuery = page.getByTestId("search-query");
        await searchQuery.fill("Hydra TV");
        await expect(page.getByTestId("autocomplete-option")).toBeVisible();
        await searchQuery.press("ArrowDown");
        await searchQuery.press("Enter");
        await expect(page.getByTestId("additional-query")).toBeEnabled();
        await page.getByLabel("Season").fill("1");
        await page.getByLabel("Episode").fill("2");
        const searchResponse = page.waitForResponse((response) =>
            isSearchResponse(response),
        );
        await page.getByTestId("search-submit").click();
        const request = (await searchResponse)
            .request()
            .postDataJSON() as Record<string, unknown>;
        expect(request).toMatchObject({
            title: "Hydra TV",
            tvdbId: "31337",
            season: 1,
            episode: "2",
        });
    });
});

function isSearchResponse(
    response: import("@playwright/test").Response,
): boolean {
    return (
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/internalapi/search"
    );
}
