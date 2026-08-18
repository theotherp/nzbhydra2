import {dismissWelcomeDialog, expect, test} from "./fixtures";
import {
    captureVisualRegion,
    expectVisualGeometry,
    prepareVisualEvidence,
    visualViewports,
} from "./visualEvidence";

const movieQuery = "Hydra Browser Movie";

test.describe("Search", () => {
    test.beforeEach(async ({hydra, page}) => {
        await hydra.configureMockIndexers(["1", "2"]);
        await page.goto("/");
        await dismissWelcomeDialog(page);
        await expect(page.getByTestId("search-query")).toBeVisible();
    });

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
            "Loaded 5",
        );
        await expect(page.getByTestId("search-results-summary")).toContainText(
            "of 5 results",
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

    test("should save, reopen, rerun, and delete a React saved search with legacy comparison", async ({
        page,
    }) => {
        await page.goto("ui/react?redirect=/");
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

        await page.goto("ui/legacy?redirect=/stats/saved-searches");
        await expect(page).toHaveURL(/\/stats\/saved-searches$/);
        await expect(page.getByText("saved React criteria")).toBeVisible();

        await page.goto("ui/react?redirect=/stats/saved-searches");
        await expect(
            page.getByRole("heading", {name: "Saved searches"}),
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
        await page.goto("ui/react?redirect=/");
        await expect(page).toHaveURL(/\/$/);
        await expect(page.getByTestId("search-query")).toBeVisible();
        await page.getByTestId("search-query").fill("uitest");
        const searchResponse = page.waitForResponse((response) =>
            isSearchResponse(response),
        );
        await page.getByTestId("search-submit").click();
        expect((await searchResponse).status()).toBe(200);
        await expect(page.getByTestId("search-results")).toBeVisible();
        await expect(page.getByTestId("search-results-summary")).toContainText(
            "Loaded",
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
                await page.goto("ui/react?redirect=/");
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
            const [rowBackground, pageBackground] = await Promise.all([
                primary.evaluate(
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
                "Minimum age (days)",
                "Maximum age (days)",
                "Minimum size (MB)",
                "Maximum size (MB)",
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
            await advancedToggle.click();
            await expect(advancedPanel).toBeHidden();
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
            expect(submitBox.height).toBeGreaterThanOrEqual(36);
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
        const recentSearches = page.waitForResponse(
            (response) =>
                new URL(response.url()).pathname ===
                    "/internalapi/history/searches/forsearching" &&
                response.request().method() === "POST",
        );
        await page.getByTestId("search-submit").click();
        expect((await recentSearches).status()).toBe(200);
        await page.getByTestId("recent-searches-trigger").click();
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
        await expect(page.getByRole("checkbox").first()).toBeVisible();
        await expectVisualGeometry(page, {
            region: "checkbox-indexers-desktop",
            locator: page.getByTestId("workspace-indexers"),
            minimumWidth: 600,
        });

        for (const viewport of ["desktop", "mobile"] as const) {
            await prepareVisualEvidence(page, viewport, async () => {
                await page.goto("ui/react?redirect=/");
                await page.getByTestId("search-category-control").click();
                await page.getByTestId("search-category-option-TV").click();
                await expect(page.getByLabel("Season")).toBeVisible();
            });
            await expectVisualGeometry(page, {
                region: `media-refinement-${viewport}`,
                locator: page.getByTestId("workspace-media-refinement"),
                minimumWidth: viewport === "desktop" ? 600 : 300,
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
            expect(pairBox?.width ?? 0).toBeLessThan(
                (refinementFieldBox?.width ?? 0) / 2,
            );
            await page.getByLabel("Season").focus();
            await page.keyboard.type("3");
            await page.getByLabel("Episode").focus();
            await page.keyboard.type("4");
            await expect(page.getByLabel("Season")).toHaveValue("3");
            await expect(page.getByLabel("Episode")).toHaveValue("4");
        }
    });

    test("should render deterministic STOMP progress in the React search modal", async ({
        page,
    }) => {
        await page.goto("ui/react?redirect=/");
        await expect(page).toHaveURL(/\/$/);
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
        } finally {
            const disableDemo = await page.request.delete(
                "/internalapi/demomode",
            );
            expect(disableDemo.status()).toBe(200);
        }
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

        await page.goto("ui/react?redirect=/");
        await expect(page).toHaveURL(/\/$/);
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
        const initialRecentSearches = page.waitForResponse(
            (response) =>
                response.request().method() === "POST" &&
                new URL(response.url()).pathname ===
                    "/internalapi/history/searches/forsearching",
        );
        await page.goto("ui/react?redirect=/");
        await expect(page).toHaveURL(/\/$/);
        await initialRecentSearches;
        await page.getByRole("combobox", {name: "Indexers"}).click();
        await page.getByRole("option", {name: "Mock1"}).click();
        await page.keyboard.press("Escape");
        await page.getByTestId("search-query").fill("recent criteria");
        // FM-044 relocated the age/size ranges into the collapsed `Advanced`
        // disclosure; the criteria, their labels, and their bindings are
        // unchanged, so only the disclosure has to be opened first.
        await page.getByTestId("search-advanced-toggle").click();
        await page.getByLabel("Minimum age (days)").fill("2");
        await page.getByLabel("Maximum size (MB)").fill("50");
        const firstSearch = page.waitForResponse((response) =>
            isSearchResponse(response),
        );
        await page.getByTestId("search-submit").click();
        expect((await firstSearch).request().postDataJSON()).toMatchObject({
            minage: 2,
            maxsize: 50,
            indexers: ["Mock2"],
        });
        await page.getByTestId("recent-searches-trigger").click();
        await expect(
            page.getByText(/Query: recent criteria/).first(),
        ).toBeVisible();
        await expect(
            page.getByRole("button", {name: /^Refill:/}).first(),
        ).toBeVisible();
        // prettier-ignore
        await page.getByRole("button", {name: /^Refill:/}).first().click();
        // Refilling remounts the workspace, so the FM-044 `Advanced`
        // disclosure holding the refilled ranges starts collapsed again.
        await page.getByTestId("search-advanced-toggle").click();
        await expect(page.getByLabel("Minimum age (days)")).toHaveValue("2");
        await expect(page.getByLabel("Maximum size (MB)")).toHaveValue("50");
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

        await page.goto("ui/react?redirect=/");
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
        await page.goto("ui/react?redirect=/");
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

        // The shared `beforeEach`'s bare `page.goto("/")` does not carry the
        // `nzbhydra-ui=react` cookie (`MainWeb.isReactSelected` defaults to
        // legacy without it), and this defect exists only in
        // `SearchWorkspace.tsx`/`SearchPage.tsx` -- legacy's `getSearchQuery()`
        // already has no fallback chain. Select React explicitly, the same
        // way the ADR-0012 keyboard test above does.
        await page.goto("ui/react?redirect=/");
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

    test("should preselect configured source quick filters", async ({
        hydra,
        page,
    }) => {
        const config = await hydra.getConfig();
        const searching = config.searching as Record<string, unknown>;
        searching.showQuickFilterButtons = true;
        searching.alwaysShowQuickFilterButtons = true;
        searching.preselectQuickFilterButtons = ["source|web"];
        await hydra.saveConfig(config);
        await page.reload();
        await expect(page.getByTestId("search-query")).toBeVisible();

        await page.getByTestId("search-query").fill("movies");
        await page.getByTestId("search-submit").click();

        await expect(page.getByTestId("search-status-modal")).toBeHidden();
        await expect(
            page.getByRole("button", {name: "WEB", exact: true}),
        ).toHaveClass(/active/);

        const resultTitles = page.getByTestId("search-result-title");
        await expect(resultTitles.first()).toBeVisible();
        const titles = await resultTitles.allTextContents();
        expect(titles).not.toEqual([]);
        expect(
            titles.every((title) => title.toLowerCase().includes("web-dl")),
        ).toBe(true);
    });

    test("should apply later quick filters after deselecting quality and other filters", async ({
        hydra,
        page,
    }) => {
        const config = await hydra.getConfig();
        const searching = config.searching as Record<string, unknown>;
        searching.showQuickFilterButtons = true;
        searching.alwaysShowQuickFilterButtons = true;
        searching.customQuickFilterButtons = ["BLURAY=bluray"];
        searching.preselectQuickFilterButtons = [
            "quality|q720p",
            "other|q3d",
            "custom|BLURAY",
        ];
        await hydra.saveConfig(config);
        await page.reload();
        await expect(page.getByTestId("search-query")).toBeVisible();

        await page.getByTestId("search-query").fill("movies");
        await page.getByTestId("search-submit").click();

        await expect(page.getByTestId("search-status-modal")).toBeHidden();
        await page.getByRole("button", {name: "720p", exact: true}).click();

        const resultTitles = page.getByTestId("search-result-title");
        await expect
            .poll(async () => {
                const titles = await resultTitles.allTextContents();
                return (
                    titles.length > 0 &&
                    titles.every((title) =>
                        title.toLowerCase().includes("3d bluray"),
                    )
                );
            })
            .toBe(true);

        await page.getByRole("button", {name: "3D", exact: true}).click();
        await expect
            .poll(async () => {
                const titles = await resultTitles.allTextContents();
                return (
                    titles.length > 0 &&
                    titles.every((title) =>
                        title.toLowerCase().includes("bluray"),
                    )
                );
            })
            .toBe(true);
    });

    test("should select a movie autocomplete result and search by TMDB identifier", async ({
        page,
    }) => {
        await page.getByTestId("search-category-control").click();
        await page.getByTestId("search-category-option-Movies").click();
        await page.locator("#minsize").fill("");
        await page.locator("#maxsize").fill("");

        const searchQuery = page.getByTestId("search-query");
        await searchQuery.fill(movieQuery.slice(0, -1));
        const autocompleteResponse = page.waitForResponse(
            (response) =>
                response.request().method() === "GET" &&
                new URL(response.url()).pathname ===
                    "/internalapi/autocomplete/MOVIE",
        );
        await searchQuery.press("End");
        await searchQuery.type(movieQuery.slice(-1));

        const response = await autocompleteResponse;
        expect(response.status()).toBe(200);
        expect(response.headers()["content-type"]).toContain(
            "application/json",
        );
        const autocomplete = (await response.json()) as Array<{
            title?: string;
            tmdbId?: string;
            year?: number;
        }>;
        expect(autocomplete).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    title: movieQuery,
                    tmdbId: "424242",
                    year: 2000,
                }),
            ]),
        );

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

        await expect(page.getByTestId("search-status-modal")).toBeHidden();
        await expect(
            page
                .getByTestId("search-result-title")
                .filter({hasText: "Hydra Downloader Integration Movie"}),
        ).toBeVisible();
    });

    test("should select a movie autocomplete result through the React route and search by TMDB identifier", async ({
        page,
    }) => {
        await page.goto("ui/react?redirect=/");
        await expect(page).toHaveURL(/\/$/);
        await page.getByTestId("search-category-control").click();
        await page.getByTestId("search-category-option-Movies").click();

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
    });

    test("should select a TV autocomplete result with the keyboard and search by TVDB identifier", async ({
        page,
    }) => {
        await page.goto("ui/react?redirect=/");
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
