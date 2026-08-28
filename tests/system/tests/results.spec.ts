import {
    dismissWelcomeDialog,
    expect,
    searchForResult,
    test,
    testEnvironment,
} from "./fixtures";
import {
    captureVisualRegion,
    expectVisualGeometry,
    prepareVisualEvidence,
    visualEvidencePath,
    visualViewports,
} from "./visualEvidence";

test.describe("Search results", () => {
    test.beforeEach(async ({hydra, page}) => {
        await hydra.configureMockIndexers(["1", "2"]);
        // FM-091: pre-raise the one-time group-episodes help flag so none of
        // this file's other tests -- most of which run TV-category searches
        // with grouping on by default -- unexpectedly trip a dialog they
        // never accounted for (an open MUI dialog intercepts pointer events
        // for the rest of the page). Only the dedicated FM-091 test below
        // resets the flag to exercise the dialog itself, and restores it
        // afterward.
        await page.request.put(
            "/internalapi/genericstorage/isGroupEpisodesHelpShown?forUser=true",
            {data: true},
        );
        // FM-095: with the legacy shell and its selector gone this is simply
        // the application's root. It reached here through
        // `ui/react?redirect=/` while two shells existed, so that every test
        // below stated which one it was about; there is only one now.
        await page.goto("/");
        await dismissWelcomeDialog(page);
        await expect(page.getByTestId("search-query")).toBeVisible();
    });

    // FM-094: retargeted from the legacy shell, whose sort header reported
    // `ascending`/`descending`. React's own per-column sort test below covers
    // one direction per column only, so the both-directions toggle would have
    // been lost with the legacy shell; it is kept here against React instead.
    test("should sort results by title in both directions", async ({page}) => {
        await searchForUiTestResults(page);

        const titleSort = page.getByTestId("sort-title");
        await expect(titleSort).toHaveAttribute("data-sort-direction", "none");
        await titleSort.click();
        await expect(titleSort).toHaveAttribute("data-sort-direction", "asc");
        await expectVisibleResultTitles(
            page,
            [...testEnvironment.uiTestResultTitles].sort(),
        );

        await titleSort.click();
        await expect(titleSort).toHaveAttribute("data-sort-direction", "desc");
        await expectVisibleResultTitles(
            page,
            [...testEnvironment.uiTestResultTitles].sort().reverse(),
        );
    });

    // FM-094: the legacy "should filter titles and sizes through result
    // controls" test is gone with the legacy shell. It drove legacy's inline
    // per-column header filters (`freetext-filter-title`,
    // `filter-toggle-size`, `number-filter-{min,max,apply}-size`), a surface
    // React deliberately does not have: ADR-0009 replaced it with the single
    // refine sidebar, and `expectNoInlineFilterControls` below asserts the
    // inline controls stay absent. The filtering behaviour itself is covered
    // against React by "should sort and filter deterministic results in the
    // React shell" (title text filter, invalid-regex non-match, size minimum)
    // and by "should sort every column and filter deterministic React results"
    // (indexer, category, grabs and age filters plus the quick filters).
    test("should match x265 and HEVC quick filters without matching near misses", async ({
        hydra,
        page,
    }) => {
        const config = await hydra.getConfig();
        const searching = config.searching as Record<string, unknown>;
        searching.showQuickFilterButtons = true;
        searching.alwaysShowQuickFilterButtons = true;
        searching.preselectQuickFilterButtons = [];
        await hydra.saveConfig(config);
        await page.reload();

        await page.getByTestId("search-query").fill("movies");
        await page.getByTestId("search-submit").click();
        await expect(page.getByTestId("search-status-modal")).toBeHidden();
        // FM-094: retargeted from the legacy shell. The near-miss rule itself
        // (an `x265` quick filter must not match `HEVC` and vice versa) is a
        // real React behaviour with no other coverage -- the React per-column
        // test only asserts preselected quick filters against titles that
        // carry both tokens -- so it is kept rather than deleted. Under
        // ADR-0009 the quick filters live in the refine sidebar, not in a
        // toolbar row, hence the extra open.
        await openRefineSidebar(page);
        const resultTitles = page.getByTestId("search-result-title");
        await page.getByRole("button", {name: "x265", exact: true}).click();
        await expect
            .poll(async () => {
                const titles = await resultTitles.allTextContents();
                return (
                    titles.length > 0 &&
                    titles.every((title) =>
                        title.toLowerCase().includes("x265"),
                    )
                );
            })
            .toBe(true);

        await page.getByRole("button", {name: "x265", exact: true}).click();
        await page.getByRole("button", {name: "HEVC", exact: true}).click();
        await expect
            .poll(async () => {
                const titles = await resultTitles.allTextContents();
                return (
                    titles.length > 0 &&
                    titles.every((title) =>
                        title.toLowerCase().includes("hevc"),
                    )
                );
            })
            .toBe(true);
    });

    // FM-094: moved here from `search.spec.ts`, where it ran against the legacy
    // shell. Under ADR-0009 the quick filters are part of the refine sidebar,
    // so the test belongs with this file's sidebar helpers; the extra
    // `openRefineSidebar` is the only change its body needed. The rule it pins
    // -- switching one preselected family's filter off leaves the remaining
    // families still filtering -- has no other coverage: the React per-column
    // test below switches all four families off at once.
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
        await openRefineSidebar(page);
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

    test("should treat invalid title and quick-filter regexes as non-matches", async ({
        hydra,
        page,
    }) => {
        const config = await hydra.getConfig();
        const searching = config.searching as Record<string, unknown>;
        searching.showQuickFilterButtons = true;
        searching.alwaysShowQuickFilterButtons = true;
        searching.customQuickFilterButtons = ["Invalid regex=/[/"];
        searching.preselectQuickFilterButtons = ["custom|Invalid regex"];
        await hydra.saveConfig(config);
        await page.reload();

        await page
            .getByTestId("search-query")
            .fill(testEnvironment.uiTestQuery);
        await page.getByTestId("search-submit").click();
        await expect(page.getByTestId("search-status-modal")).toBeHidden();
        await expect(page.getByTestId("search-result-row")).toHaveCount(0);

        // FM-094: retargeted from the legacy shell. The invalid *title* regex
        // half is also covered by "should sort and filter deterministic
        // results in the React shell", but the invalid *quick-filter* regex
        // half -- a preselected custom quick filter whose pattern does not
        // compile must reject every result until it is switched off -- has no
        // other coverage, so the test is kept and repointed rather than
        // deleted. The title filter moves from legacy's inline column control
        // to the refine sidebar's `refine-filter-title` (ADR-0009).
        await openRefineSidebar(page);
        await page
            .getByRole("button", {name: "Invalid regex", exact: true})
            .click();
        await expectVisibleResultTitles(
            page,
            testEnvironment.uiTestResultTitles,
        );
        await page.getByTestId("refine-filter-title").fill("/[/");
        await expect(page.getByTestId("search-result-row")).toHaveCount(0);
    });

    // FM-094: retargeted from the legacy shell with the `beforeEach` above.
    // Nothing here is shell-specific -- it rewrites one real backend result's
    // title to `null` and asserts the table renders the remaining four -- and
    // the rule it pins (a malformed result must not abort the render) is one
    // React must honour too, so it is kept rather than deleted.
    test("should discard titleless results without interrupting rendering", async ({
        page,
    }) => {
        await page.route("**/internalapi/search", async (route) => {
            const response = await route.fetch();
            const body = (await response.json()) as {
                searchResults: Array<{title: string | null}>;
            };
            body.searchResults[0].title = null;
            await route.fulfill({response, json: body});
        });

        await searchForResult(
            page,
            testEnvironment.uiTestQuery,
            "indexer1-result2",
        );
        await expect(page.getByTestId("search-result-row")).toHaveCount(4);
    });

    // FM-094: the legacy "should clear every filtered-out selection" test is
    // gone with the legacy shell, and this behaviour is deliberately not
    // reproduced rather than merely unimplemented. Legacy's
    // `search-results-controller.js` dropped a row's selection as soon as a
    // filter hid it; React models the selection as a stable set of
    // `searchResultId`s that result-side filters never mutate -- see
    // `SearchResults.tsx`'s `selected` state, whose only pruning is the
    // post-download one, and the component test "should reset every
    // result-side filter via refine-clear-all while leaving sorting,
    // grouping, and selection untouched"
    // (`SearchResults.test.tsx`), which pins exactly that rule. Retargeting
    // this test would therefore assert the opposite of React's designed
    // behaviour. See the handoff's Follow-Up Work for the one open parity
    // question this leaves (whether a bulk send should skip selected rows the
    // active filters hide).

    // FM-094: the legacy "should retain the configured title-group page size
    // after recalculation" test is gone with the legacy shell. It pinned
    // legacy's own display page size: `search-results-controller.js:9` reads
    // `searching.loadLimitInternal` into `$scope.limitTo` and paginates the
    // rendered title groups by it. React has no such client-side page size --
    // retargeting the test would assert a surface that deliberately does not
    // exist here; verified by running it against React, which renders all 10
    // rows the search returned rather than 1. React's own result paging is
    // covered by "should load more and all React results from advancing cache
    // offsets" and "should stop React load-more after a non-advancing
    // terminal cursor". `loadLimitInternal` still governs internal searches:
    // `SearchPage.tsx` sends every internal request without a `limit`, and
    // `SearchRequestFactory.java:26-30` substitutes this setting server-side
    // as the fetch size, so the results view pages through whatever that
    // fetch returned. ADR-0032 answers the question this comment used to
    // leave open: the setting is not ignored, it governs fetch size rather
    // than display page size, and FM-116 corrected its label and help to say
    // so.

    test("should sort and filter deterministic results in the React shell", async ({
        page,
    }) => {
        await page.goto("/");
        await page
            .getByTestId("search-query")
            .fill(testEnvironment.uiTestQuery);
        await page.getByTestId("search-submit").click();
        await expectVisibleResultTitles(
            page,
            testEnvironment.uiTestResultTitles,
        );

        const titleSort = page.getByTestId("sort-title");
        await titleSort.click();
        await expect(titleSort).toHaveAttribute("data-sort-direction", "asc");
        await expectVisibleResultTitles(
            page,
            [...testEnvironment.uiTestResultTitles].sort(),
        );

        // FM-045 made the refine-sidebar the single filter surface at every
        // viewport: the mobile-only `results-filters` row this test used to
        // drive (`freetext-filter-title`, the bare `number-filter-*-size`
        // fields) is gone, and so is the pre-existing failure that came from
        // reaching into that below-`sm`-only row at a desktop viewport.
        await openRefineSidebar(page);
        const titleFilter = page.getByTestId("refine-filter-title");
        await titleFilter.fill("indexer2 !result3");
        await expectVisibleResultTitles(
            page,
            testEnvironment.uiTestResultTitles.slice(3, 5),
        );
        await titleFilter.fill("/[/");
        await expect(page.getByTestId("search-result-row")).toHaveCount(0);
        await titleFilter.fill("");

        await page.getByTestId("number-filter-min-refine-size").fill("4");
        await expectVisibleResultTitles(
            page,
            testEnvironment.uiTestResultTitles.slice(3),
        );
        await page.getByTestId("number-filter-clear-refine-size").click();
        await expectVisibleResultTitles(
            page,
            [...testEnvironment.uiTestResultTitles].sort(),
        );
    });

    test("should expand grouped React results and select visible rows", async ({
        page,
    }) => {
        await mockGroupedResults(page);
        await page.goto("/");
        await searchForGroupedResults(page);

        await assertGroupExpansionAndBulkSelection(page);
    });

    // FM-094: the legacy "should expand grouped legacy results and select
    // visible rows" test and its `assertLegacyGroupExpansionAndBulkSelection`
    // helper are gone with the legacy shell. Both drove legacy-only DOM
    // (`.duplicate-expand-toggle`, `#search-results-selection-button` and its
    // `.selection-button-*` dropdown entries) over the same mocked grouped
    // payload the React sibling directly above uses; that sibling asserts the
    // identical capability -- expand duplicates, select all, invert selection
    // -- through React's own affordances, so no behaviour loses coverage.

    test("should sort every column and filter deterministic React results", async ({
        hydra,
        page,
    }) => {
        const config = await hydra.getConfig();
        const searching = config.searching as Record<string, unknown>;
        searching.showQuickFilterButtons = true;
        searching.alwaysShowQuickFilterButtons = true;
        searching.customQuickFilterButtons = ["Preferred=x265"];
        searching.preselectQuickFilterButtons = [
            "source|web",
            "quality|q1080p",
            "other|x265",
            "custom|Preferred",
        ];
        await hydra.saveConfig(config);

        const now = Math.floor(Date.now() / 1_000);
        await page.route("**/internalapi/search", (route) =>
            route.fulfill({
                json: {
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Alpha WEB-DL 1080p x265",
                            indexer: "Beta",
                            category: "TV",
                            size: 5 * 1024 * 1024,
                            seeders: 10,
                            epoch: now - 86_400,
                            age: "1 day",
                        },
                        {
                            searchResultId: "2",
                            title: "Bravo BluRay 720p HEVC",
                            indexer: "Alpha",
                            category: "Movies",
                            size: 2 * 1024 * 1024,
                            grabs: 3,
                            epoch: now - 5 * 86_400,
                            age: "5 days",
                        },
                        {
                            searchResultId: "3",
                            title: "Charlie WEB 2160p x265",
                            indexer: "Gamma",
                            category: "Movies",
                            size: 7 * 1024 * 1024,
                            seeders: 7,
                            epoch: now - 3 * 86_400,
                            age: "3 days",
                        },
                    ],
                    indexerSearchMetaDatas: [],
                    indexerLimitWarnings: [],
                    rejectedReasonsMap: {},
                    notPickedIndexersWithReason: {},
                    numberOfAvailableResults: 3,
                    numberOfRejectedResults: 0,
                },
            }),
        );
        await page.goto("/");
        await page.getByTestId("search-query").fill("deterministic filters");
        await page.getByTestId("search-submit").click();
        await expect(page.getByTestId("search-status-modal")).toBeHidden();
        // Every filter dimension this test exercises now lives in the
        // refine-sidebar only (FM-045); the quick filters included.
        await openRefineSidebar(page);

        for (const name of ["WEB", "1080p", "x265", "Preferred"]) {
            await expect(
                page.getByRole("button", {name, exact: true}),
            ).toHaveAttribute("aria-pressed", "true");
        }
        await expectVisibleResultTitles(page, ["Alpha WEB-DL 1080p x265"]);
        for (const name of ["WEB", "1080p", "x265", "Preferred"]) {
            await page.getByRole("button", {name, exact: true}).click();
        }
        await expectVisibleResultTitles(page, [
            "Alpha WEB-DL 1080p x265",
            "Charlie WEB 2160p x265",
            "Bravo BluRay 720p HEVC",
        ]);

        for (const [column, direction, firstTitle] of [
            ["title", "asc", "Alpha WEB-DL 1080p x265"],
            ["indexer", "asc", "Bravo BluRay 720p HEVC"],
            ["category", "asc", "Bravo BluRay 720p HEVC"],
            ["size", "desc", "Charlie WEB 2160p x265"],
            ["grabs", "desc", "Alpha WEB-DL 1080p x265"],
            ["epoch", "desc", "Alpha WEB-DL 1080p x265"],
        ]) {
            const sort = page.getByTestId(`sort-${column}`);
            await sort.click();
            const headerCell = sort.locator(
                "xpath=ancestor::*[self::th or self::td][1]",
            );
            await expect(headerCell).toHaveAttribute(
                "aria-sort",
                direction === "asc" ? "ascending" : "descending",
            );
            await expect(sort).toHaveAttribute(
                "data-sort-direction",
                direction,
            );
            await expect(
                page
                    .getByTestId("search-results-table")
                    .getByTestId("search-result-row")
                    .first(),
            ).toHaveAttribute("data-result-title", firstTitle);
        }

        const betaIndexer = refineOption(page, "refine-indexer-option", "Beta");
        await expect(betaIndexer).toHaveAttribute("aria-pressed", "true");
        await betaIndexer.click();
        await expect(betaIndexer).toHaveAttribute("aria-pressed", "false");
        await expectVisibleResultTitles(page, [
            "Charlie WEB 2160p x265",
            "Bravo BluRay 720p HEVC",
        ]);
        await betaIndexer.click();
        await expect(betaIndexer).toHaveAttribute("aria-pressed", "true");

        const tvCategory = refineOption(page, "refine-category-option", "TV");
        await tvCategory.click();
        await expect(tvCategory).toHaveAttribute("aria-pressed", "false");
        await expectVisibleResultTitles(page, [
            "Charlie WEB 2160p x265",
            "Bravo BluRay 720p HEVC",
        ]);
        await tvCategory.click();
        await expect(tvCategory).toHaveAttribute("aria-pressed", "true");

        await page.getByTestId("number-filter-min-refine-grabs").fill("8");
        await expectVisibleResultTitles(page, ["Alpha WEB-DL 1080p x265"]);
        await page.getByTestId("number-filter-clear-refine-grabs").click();

        await page.getByTestId("number-filter-max-refine-age").fill("2");
        await expectVisibleResultTitles(page, ["Alpha WEB-DL 1080p x265"]);
        await page.getByTestId("number-filter-clear-refine-age").click();
        await expectVisibleResultTitles(page, [
            "Alpha WEB-DL 1080p x265",
            "Charlie WEB 2160p x265",
            "Bravo BluRay 720p HEVC",
        ]);
    });

    test("should load more and all React results from advancing cache offsets", async ({
        page,
    }) => {
        const requests: Array<Record<string, unknown>> = [];
        await page.route("**/internalapi/search", async (route) => {
            const request = route.request().postDataJSON() as Record<
                string,
                unknown
            >;
            requests.push(request);
            const offset =
                typeof request.offset === "number" ? request.offset : 0;
            const loadAll = request.loadAll === true;
            const result = (id: string) => ({
                searchResultId: id,
                title: `Paged result ${id}`,
                indexer: "Mock",
                category: "All",
            });
            await route.fulfill({
                json: {
                    searchResults: loadAll
                        ? [result("one"), result("two"), result("three")]
                        : offset === 0
                          ? [result("one")]
                          : [result("one"), result("two")],
                    indexerSearchMetaDatas: [
                        {
                            indexerName: "Mock",
                            wasSuccessful: true,
                            hasMoreResults: loadAll ? true : offset < 1,
                            totalResultsKnown: true,
                        },
                    ],
                    indexerLimitWarnings: [],
                    rejectedReasonsMap: {},
                    notPickedIndexersWithReason: {},
                    numberOfAvailableResults: 3,
                    numberOfRejectedResults: 0,
                    numberOfProcessedResults: loadAll ? 3 : offset + 1,
                    numberOfAcceptedResults: loadAll ? 3 : offset + 1,
                    offset: loadAll ? 0 : offset,
                    limit: loadAll ? 0 : 1,
                },
            });
        });
        await page.goto("/");
        await page.getByTestId("search-query").fill("paging");
        await page.getByTestId("search-submit").click();
        await expectVisibleResultTitles(page, ["Paged result one"]);

        await page.getByRole("button", {name: "Load more"}).click();
        await expectVisibleResultTitles(page, [
            "Paged result one",
            "Paged result two",
        ]);
        await page.getByRole("button", {name: "Load all results"}).click();
        await expectVisibleResultTitles(page, [
            "Paged result one",
            "Paged result two",
            "Paged result three",
        ]);
        expect(requests.slice(1)).toEqual([
            expect.objectContaining({offset: 1, loadAll: false}),
            expect.objectContaining({offset: 2, limit: 1, loadAll: true}),
        ]);
    });

    test("should stop React load-more after a non-advancing terminal cursor", async ({
        page,
    }) => {
        const requests: Array<Record<string, unknown>> = [];
        await page.route("**/internalapi/search", async (route) => {
            const request = route.request().postDataJSON() as Record<
                string,
                unknown
            >;
            requests.push(request);
            const continuation = request.offset === 1;
            await route.fulfill({
                json: {
                    searchResults: [
                        {
                            searchResultId: "one",
                            title: "Paged result one",
                            indexer: "Mock",
                            category: "All",
                        },
                    ],
                    indexerSearchMetaDatas: [
                        {
                            indexerName: "Mock",
                            wasSuccessful: true,
                            hasMoreResults: true,
                            totalResultsKnown: true,
                        },
                    ],
                    indexerLimitWarnings: [],
                    rejectedReasonsMap: {},
                    notPickedIndexersWithReason: {},
                    numberOfAvailableResults: 2,
                    numberOfRejectedResults: 0,
                    numberOfProcessedResults: 1,
                    numberOfAcceptedResults: 1,
                    offset: 0,
                    limit: continuation ? 0 : 1,
                },
            });
        });
        await page.goto("/");
        await page.getByTestId("search-query").fill("non-advancing paging");
        await page.getByTestId("search-submit").click();
        await expectVisibleResultTitles(page, ["Paged result one"]);

        await page.getByRole("button", {name: "Load more"}).click();
        await expect(
            page.getByText(
                "The server did not advance the search cache position.",
            ),
        ).toBeVisible();
        const loadMore = page.getByRole("button", {name: "Load more"});
        const loadAll = page.getByRole("button", {name: "Load all results"});
        await expect(loadMore).toBeDisabled();
        await expect(loadAll).toBeDisabled();
        await loadMore.click({force: true});
        await loadAll.click({force: true});
        expect(requests).toHaveLength(2);
        expect(requests[1]).toMatchObject({offset: 1, loadAll: false});
    });

    test("should provide deterministic React results visual evidence across desktop and mobile", async ({
        page,
    }) => {
        const now = Math.floor(Date.now() / 1_000);
        await page.route("**/internalapi/search", (route) =>
            route.fulfill({
                json: {
                    searchResults: [
                        {
                            searchResultId: "one",
                            title: "Visual Evidence Example Show S01E01",
                            indexer: "Alpha",
                            category: "TV",
                            size: 4 * 1024 * 1024,
                            seeders: 12,
                            epoch: now - 86_400,
                            age: "1 day",
                            hash: 1,
                            downloadType: "NZB",
                        },
                        {
                            searchResultId: "two",
                            title: "Visual Evidence Example Show S01E01",
                            indexer: "Beta",
                            category: "TV",
                            size: 3 * 1024 * 1024,
                            seeders: 8,
                            epoch: now - 2 * 86_400,
                            age: "2 days",
                            hash: 1,
                            downloadType: "NZB",
                        },
                        {
                            searchResultId: "three",
                            title: "Visual Evidence Another Release",
                            indexer: "Gamma",
                            category: "Movies",
                            size: 6 * 1024 * 1024,
                            seeders: 5,
                            epoch: now - 3 * 86_400,
                            age: "3 days",
                            downloadType: "NZB",
                        },
                    ],
                    indexerSearchMetaDatas: [
                        {indexerName: "Alpha", wasSuccessful: true},
                        {indexerName: "Beta", wasSuccessful: true},
                        {indexerName: "Gamma", wasSuccessful: true},
                    ],
                    indexerLimitWarnings: [],
                    rejectedReasonsMap: {},
                    notPickedIndexersWithReason: {},
                    numberOfAvailableResults: 3,
                    numberOfRejectedResults: 0,
                },
            }),
        );

        for (const [viewport, minimumWidth] of Object.entries({
            desktop: 600,
            mobile: 300,
        }) as Array<[keyof typeof visualViewports, number]>) {
            await prepareVisualEvidence(page, viewport, async () => {
                await page.goto("/");
                await page
                    .getByTestId("search-query")
                    .fill("visual evidence results");
                await page.getByTestId("search-submit").click();
                await expect(
                    page.getByTestId("search-status-modal"),
                ).toBeHidden();
                await expect(
                    page.getByTestId("search-results-table"),
                ).toBeVisible();
            });

            const toolbar = page.getByTestId("results-toolbar");
            const resultsTable = page.getByTestId("search-results-table");
            await expectVisualGeometry(page, {
                region: `results-toolbar-${viewport}`,
                locator: toolbar,
                minimumWidth,
            });
            await expectVisualGeometry(page, {
                region: `search-results-table-${viewport}`,
                locator: resultsTable,
                minimumWidth,
            });

            const [toolbarBox, tableBox] = await Promise.all([
                toolbar.boundingBox(),
                resultsTable.boundingBox(),
            ]);
            expect(toolbarBox).not.toBeNull();
            expect(tableBox).not.toBeNull();
            if (!toolbarBox || !tableBox) {
                throw new Error(
                    "Toolbar and table require deterministic geometry",
                );
            }
            expect(toolbarBox.y + toolbarBox.height).toBeLessThanOrEqual(
                tableBox.y + 1,
            );

            const directDownload = page
                .getByTestId("search-result-row")
                .first()
                .getByTestId("download-nzb");
            await expect(directDownload).toBeVisible();

            if (viewport === "desktop") {
                const titleCell = page
                    .getByTestId("sort-title")
                    .locator("xpath=ancestor::*[self::th or self::td][1]");
                const indexerCell = page
                    .getByTestId("sort-indexer")
                    .locator("xpath=ancestor::*[self::th or self::td][1]");
                const [titleCellBox, indexerCellBox] = await Promise.all([
                    titleCell.boundingBox(),
                    indexerCell.boundingBox(),
                ]);
                expect(titleCellBox).not.toBeNull();
                expect(indexerCellBox).not.toBeNull();
                if (!titleCellBox || !indexerCellBox) {
                    throw new Error(
                        "Header cells require deterministic geometry",
                    );
                }
                expect(titleCellBox.width).toBeGreaterThan(
                    indexerCellBox.width * 2,
                );

                const sizeHeaderCell = page
                    .getByTestId("sort-size")
                    .locator("xpath=ancestor::*[self::th or self::td][1]");
                const sizeHeaderAlign = await sizeHeaderCell.evaluate(
                    (element) => getComputedStyle(element).textAlign,
                );
                expect(sizeHeaderAlign).toBe("right");

                for (const column of [
                    "title",
                    "indexer",
                    "category",
                    "size",
                    "grabs",
                    "epoch",
                ]) {
                    const noHeaderOverflow = await page
                        .getByTestId(`sort-${column}`)
                        .evaluate(
                            (element) =>
                                element.scrollWidth <= element.clientWidth + 1,
                        );
                    expect(noHeaderOverflow).toBe(true);
                }

                const [download] = await Promise.all([
                    page.waitForEvent("download"),
                    directDownload.click(),
                ]);
                void download;
                const downloadedChip = page
                    .getByTestId("search-result-row")
                    .first()
                    .getByText("Downloaded");
                await expect(downloadedChip).toBeVisible();
                const chipNotClipped = await downloadedChip.evaluate(
                    (element) => element.scrollWidth <= element.clientWidth + 1,
                );
                expect(chipNotClipped).toBe(true);
            } else {
                const cellDisplay = await directDownload
                    .locator("xpath=ancestor::td[1]")
                    .evaluate((element) => getComputedStyle(element).display);
                expect(cellDisplay).toBe("flex");
            }
        }

        await page.setViewportSize(visualViewports.desktop);
        const rows = page.getByTestId("search-result-row");
        await expect(rows).toHaveCount(2);
        await page.getByRole("button", {name: "Expand duplicates"}).click();
        await expect(rows).toHaveCount(3);

        const [parentPaddingLeft, childPaddingLeft] = await Promise.all([
            rows
                .nth(0)
                .getByTestId("search-result-title")
                .evaluate((element) =>
                    parseFloat(getComputedStyle(element).paddingLeft),
                ),
            rows
                .nth(1)
                .getByTestId("search-result-title")
                .evaluate((element) =>
                    parseFloat(getComputedStyle(element).paddingLeft),
                ),
        ]);
        expect(childPaddingLeft).toBeGreaterThan(parentPaddingLeft);

        const [parentBackground, childBackground] = await Promise.all([
            rows
                .nth(0)
                .evaluate(
                    (element) => getComputedStyle(element).backgroundColor,
                ),
            rows
                .nth(1)
                .evaluate(
                    (element) => getComputedStyle(element).backgroundColor,
                ),
        ]);
        expect(childBackground).not.toBe(parentBackground);

        // The refine-sidebar is the only filter surface since FM-045, and it
        // is reachable at this desktop viewport, which is what resolves this
        // test's pre-existing `freetext-filter-title` visibility failure.
        await openRefineSidebar(page);
        await page.getByTestId("refine-filter-title").fill("Another");
        await expect(page.getByTestId("search-result-row")).toHaveCount(1);
        await expect(page.getByTestId("search-results-summary")).toContainText(
            "2 filtered",
        );
    });

    test("should provide deterministic refine-sidebar visual evidence across desktop and mobile", async ({
        page,
    }) => {
        const now = Math.floor(Date.now() / 1_000);
        await page.route("**/internalapi/search", (route) =>
            route.fulfill({
                json: {
                    searchResults: [
                        {
                            searchResultId: "one",
                            title: "Refine Sidebar Evidence Alpha",
                            indexer: "Alpha",
                            category: "TV",
                            size: 4 * 1024 * 1024,
                            seeders: 12,
                            epoch: now - 86_400,
                            age: "1 day",
                            downloadType: "NZB",
                        },
                        {
                            searchResultId: "two",
                            title: "Refine Sidebar Evidence Bravo",
                            indexer: "Beta",
                            category: "Movies",
                            size: 6 * 1024 * 1024,
                            seeders: 5,
                            epoch: now - 2 * 86_400,
                            age: "2 days",
                            downloadType: "TORBOX",
                        },
                        {
                            // No downloadType: must never be silently
                            // discarded by the Type filter's default
                            // selection.
                            searchResultId: "three",
                            title: "Refine Sidebar Evidence Charlie",
                            indexer: "Gamma",
                            category: "Movies",
                            size: 3 * 1024 * 1024,
                            seeders: 9,
                            epoch: now - 3 * 86_400,
                            age: "3 days",
                        },
                    ],
                    indexerSearchMetaDatas: [
                        {indexerName: "Alpha", wasSuccessful: true},
                        {indexerName: "Beta", wasSuccessful: true},
                        {indexerName: "Gamma", wasSuccessful: true},
                    ],
                    indexerLimitWarnings: [],
                    rejectedReasonsMap: {},
                    notPickedIndexersWithReason: {},
                    numberOfAvailableResults: 3,
                    numberOfRejectedResults: 0,
                },
            }),
        );

        // Desktop: expanded by default ("persistent left column ... at sm
        // and up").
        await prepareVisualEvidence(page, "desktop", async () => {
            await page.goto("/");
            await page
                .getByTestId("search-query")
                .fill("refine sidebar evidence");
            await page.getByTestId("search-submit").click();
            await expect(page.getByTestId("search-status-modal")).toBeHidden();
            await expect(
                page.getByTestId("search-results-table"),
            ).toBeVisible();
        });

        const sidebar = page.getByTestId("refine-sidebar");
        const table = page.getByTestId("search-results-table");
        const toggle = page.getByTestId("refine-sidebar-toggle");
        await expect(toggle).toHaveAttribute("aria-expanded", "true");

        await expectVisualGeometry(page, {
            region: "refine-sidebar-expanded-desktop",
            locator: sidebar,
            minimumWidth: 200,
        });
        await expectVisualGeometry(page, {
            region: "search-results-table-refine-expanded-desktop",
            locator: table,
        });

        const [sidebarBoxExpanded, tableBoxExpanded] = await Promise.all([
            sidebar.boundingBox(),
            table.boundingBox(),
        ]);
        expect(sidebarBoxExpanded).not.toBeNull();
        expect(tableBoxExpanded).not.toBeNull();
        if (!sidebarBoxExpanded || !tableBoxExpanded) {
            throw new Error("Sidebar and table require deterministic geometry");
        }
        // The sidebar's right edge sits at or left of the table's left edge.
        expect(
            sidebarBoxExpanded.x + sidebarBoxExpanded.width,
        ).toBeLessThanOrEqual(tableBoxExpanded.x + 1);

        const titleHeaderCell = page
            .getByTestId("sort-title")
            .locator("xpath=ancestor::*[self::th or self::td][1]");
        const indexerHeaderCell = page
            .getByTestId("sort-indexer")
            .locator("xpath=ancestor::*[self::th or self::td][1]");
        const [titleHeaderBox, indexerHeaderBox] = await Promise.all([
            titleHeaderCell.boundingBox(),
            indexerHeaderCell.boundingBox(),
        ]);
        expect(titleHeaderBox).not.toBeNull();
        expect(indexerHeaderBox).not.toBeNull();
        if (!titleHeaderBox || !indexerHeaderBox) {
            throw new Error("Header cells require deterministic geometry");
        }
        expect(titleHeaderBox.width).toBeGreaterThan(
            indexerHeaderBox.width * 2,
        );

        // FM-045 state `refine-sidebar-only-surface`: no inline filter
        // control renders in the table header, and the simplified header row
        // is measurably shorter than it was before this task at the same
        // viewport.
        await expectNoInlineFilterControls(page);
        const desktopHeaderHeight = await headerRowHeight(page);
        expect(desktopHeaderHeight).toBeLessThan(
            BASELINE_HEADER_ROW_HEIGHT_DESKTOP,
        );
        expect(desktopHeaderHeight).toBeLessThanOrEqual(52);

        // FM-045 state `refine-toggle-row-category-indexer`: every Category
        // and Indexer entry is one clickable non-checkbox row carrying its
        // own label, loaded-result count, and pressed state, with no
        // scrollWidth overflow of the row.
        for (const [listTestId, optionTestId] of [
            ["refine-category-list", "refine-category-option"],
            ["refine-indexer-list", "refine-indexer-option"],
        ]) {
            const list = page.getByTestId(listTestId);
            await expect(list).toBeVisible();
            expect(await list.locator('input[type="checkbox"]').count()).toBe(
                0,
            );
            const rows = list.getByTestId(optionTestId);
            const rowCount = await rows.count();
            expect(rowCount).toBeGreaterThan(0);
            for (let index = 0; index < rowCount; index++) {
                const row = rows.nth(index);
                await expect(row).toHaveText(/\S/);
                await expect(row).toHaveAttribute("aria-pressed", "true");
                const rowShape = await row.evaluate((element) => ({
                    noOverflow: element.scrollWidth <= element.clientWidth + 1,
                    tagName: element.tagName,
                }));
                expect(rowShape).toEqual({noOverflow: true, tagName: "BUTTON"});
            }
        }

        // A selected row's computed background differs measurably from an
        // unselected one's.
        const betaRow = refineOption(page, "refine-indexer-option", "Beta");
        const selectedBackground = await betaRow.evaluate(
            (element) => getComputedStyle(element).backgroundColor,
        );
        await betaRow.click();
        await expect(betaRow).toHaveAttribute("aria-pressed", "false");
        const unselectedBackground = await betaRow.evaluate(
            (element) => getComputedStyle(element).backgroundColor,
        );
        expect(unselectedBackground).not.toBe(selectedBackground);
        await expect(page.getByTestId("search-result-row")).toHaveCount(2);
        await betaRow.click();
        await expect(betaRow).toHaveAttribute("aria-pressed", "true");
        await expect(page.getByTestId("search-result-row")).toHaveCount(3);

        await captureVisualRegion(
            sidebar,
            "F-SEARCH-SORT-FILTER",
            "toggle-row-sidebar-desktop",
        );

        // Type is a chip group derived from the loaded results' actual
        // downloadType values (never a hardcoded NZB/Torrent pair), and the
        // result with no downloadType is never silently discarded.
        const typeChips = page.getByTestId("refine-type-chips");
        await expect(
            typeChips.getByRole("button", {name: "NZB"}),
        ).toBeVisible();
        await expect(
            typeChips.getByRole("button", {name: "TORBOX"}),
        ).toBeVisible();
        await expect(
            typeChips.getByRole("button", {name: "TORRENT"}),
        ).toHaveCount(0);
        await expect(page.getByTestId("search-result-row")).toHaveCount(3);

        // Collapsing the sidebar increases the table's bounding-box width,
        // leaves no residual gap, and is reflected by the toggle's
        // aria-expanded.
        await toggle.click();
        await expect(toggle).toHaveAttribute("aria-expanded", "false");
        await expectVisualGeometry(page, {
            region: "refine-sidebar-collapsed-desktop",
            locator: sidebar,
        });
        const [sidebarBoxCollapsed, tableBoxCollapsed] = await Promise.all([
            sidebar.boundingBox(),
            table.boundingBox(),
        ]);
        expect(sidebarBoxCollapsed).not.toBeNull();
        expect(tableBoxCollapsed).not.toBeNull();
        if (!sidebarBoxCollapsed || !tableBoxCollapsed) {
            throw new Error("Sidebar and table require deterministic geometry");
        }
        expect(tableBoxCollapsed.width).toBeGreaterThan(tableBoxExpanded.width);
        expect(
            tableBoxCollapsed.x -
                (sidebarBoxCollapsed.x + sidebarBoxCollapsed.width),
        ).toBeLessThanOrEqual(17);
        await toggle.click();
        await expect(toggle).toHaveAttribute("aria-expanded", "true");

        // A fresh mobile load starts with no stored preference.
        await page.evaluate(() => window.localStorage.clear());

        await prepareVisualEvidence(page, "mobile", async () => {
            await page.goto("/");
            await page
                .getByTestId("search-query")
                .fill("refine sidebar evidence");
            await page.getByTestId("search-submit").click();
            await expect(page.getByTestId("search-status-modal")).toBeHidden();
            await expect(
                page.getByTestId("search-results-table"),
            ).toBeVisible();
        });

        // FM-045 state `refine-sidebar-mobile-drawer`: below `sm` no docked
        // column competes with the table for width -- the sidebar only
        // exists while its drawer is open -- and the retired mobile
        // `results-filters` / `results-quick-filters` rows are gone.
        const mobileToggle = page.getByTestId("refine-sidebar-toggle");
        await expect(mobileToggle).toBeVisible();
        await expect(mobileToggle).toHaveAttribute("aria-expanded", "false");
        await expect(sidebar).toHaveCount(0);
        await expect(page.getByTestId("results-filters")).toHaveCount(0);
        await expect(page.getByTestId("results-quick-filters")).toHaveCount(0);
        await expectNoInlineFilterControls(page);
        const closedTableBox = await table.boundingBox();
        expect(closedTableBox).not.toBeNull();
        if (!closedTableBox) {
            throw new Error("Table requires deterministic geometry");
        }

        await mobileToggle.click();
        await expect(mobileToggle).toHaveAttribute("aria-expanded", "true");
        await expect(sidebar).toBeVisible();
        for (const testId of [
            "refine-clear-all",
            "refine-filter-title",
            "refine-category-list",
            "refine-indexer-list",
            "filter-toggle-refine-size",
            "filter-toggle-refine-age",
            "filter-toggle-refine-grabs",
            "refine-type-chips",
        ]) {
            await expect(sidebar.getByTestId(testId)).toBeVisible();
        }
        await expectVisualGeometry(page, {
            region: "refine-sidebar-mobile-drawer",
            locator: sidebar,
        });
        await captureVisualRegion(
            sidebar,
            "F-SEARCH-SORT-FILTER",
            "refine-sidebar-mobile-drawer",
        );

        // The title filter and one list filter drive the same shared
        // ResultFilters state from the mobile-opened sidebar, so no
        // filtering capability became unreachable at this viewport.
        const mobileTitleFilter = sidebar.getByTestId("refine-filter-title");
        await mobileTitleFilter.fill("Bravo");
        await expect(page.getByTestId("search-result-row")).toHaveCount(1);
        await mobileTitleFilter.fill("");
        await expect(page.getByTestId("search-result-row")).toHaveCount(3);
        const gammaRow = refineOption(page, "refine-indexer-option", "Gamma");
        await gammaRow.click();
        await expect(gammaRow).toHaveAttribute("aria-pressed", "false");
        await expect(page.getByTestId("search-result-row")).toHaveCount(2);
        await gammaRow.click();
        await expect(page.getByTestId("search-result-row")).toHaveCount(3);

        // Closing restores the table to its full mobile width with no
        // residual gap and no page horizontal overflow.
        await page.getByTestId("refine-sidebar-close").click();
        await expect(sidebar).toHaveCount(0);
        await expect(mobileToggle).toHaveAttribute("aria-expanded", "false");
        const reopenedTableBox = await table.boundingBox();
        expect(reopenedTableBox).not.toBeNull();
        if (!reopenedTableBox) {
            throw new Error("Table requires deterministic geometry");
        }
        expect(reopenedTableBox.width).toBe(closedTableBox.width);
        expect(reopenedTableBox.x).toBe(closedTableBox.x);
        expect(
            await page
                .locator("html")
                .evaluate(
                    (element) => element.scrollWidth <= element.clientWidth,
                ),
        ).toBe(true);
    });

    // FM-089: the refine sidebar's Category and Indexer sections persist
    // their own expand/collapse state through the same
    // `hydra.search-results.table` payload the docked-column preference
    // already uses, independently of one another. Re-runs the search after
    // `page.reload()` (the sidebar only renders with results present)
    // instead of trusting a reload alone.
    test("should persist the refine sidebar's Category/Indexer collapse state across a reload", async ({
        page,
    }) => {
        // The `beforeEach` already selected the React shell (FM-094); this
        // navigation is kept because the test needs a freshly loaded page
        // whose persisted sidebar state comes from this test's own reload
        // cycle below.
        await page.goto("/");
        await searchForUiTestResults(page);

        const categoryToggle = page.getByTestId("refine-category-toggle");
        const indexerToggle = page.getByTestId("refine-indexer-toggle");
        await expect(categoryToggle).toHaveAttribute("aria-expanded", "true");
        await expect(indexerToggle).toHaveAttribute("aria-expanded", "true");

        await categoryToggle.click();
        await expect(categoryToggle).toHaveAttribute("aria-expanded", "false");
        await expect(indexerToggle).toHaveAttribute("aria-expanded", "true");

        const persistedPayload = await page.evaluate(() =>
            window.localStorage.getItem("hydra.search-results.table"),
        );
        expect(persistedPayload).toContain('"refineCategoryOpen":false');

        // This suite's own `page` fixture (`fixtures.ts`) registers an
        // `addInitScript` that clears every key of `localStorage` on every
        // new document -- including a `page.reload()` -- so every other
        // test starts genuinely storage-clean regardless of what an earlier
        // test wrote. A real user's browser reload does not clear its own
        // storage; re-seeding the just-observed payload through the test's
        // own later-registered `addInitScript` (which layers on top of, and
        // so runs after, the fixture's clear on the very next navigation)
        // stands in for that real persistence without weakening the
        // fixture's cross-test isolation guarantee.
        await page.addInitScript((payload) => {
            window.localStorage.setItem("hydra.search-results.table", payload);
        }, persistedPayload as string);

        await page.reload();
        await searchForUiTestResults(page);

        await expect(categoryToggle).toHaveAttribute("aria-expanded", "false");
        await expect(indexerToggle).toHaveAttribute("aria-expanded", "true");
    });

    test("should provide deterministic bulk-actions-bar visual evidence across desktop and mobile", async ({
        hydra,
        page,
    }) => {
        await hydra.configureSabnzbdMock();
        // The NZB ZIP primary action's `disabled` gate is not exercised
        // against a real backend by this test: `downloadSettings().zip`
        // (core/ui-react/src/domain/downloads/actions.ts, unchanged and out
        // of this task's scope) reads `safeConfig.searching.
        // showResultsAsZipButton`, but that flag is a pre-existing, legacy
        // localStorage-only preference (core/ui-src/js/search-results-
        // controller.js) that was never part of `SearchingConfig.java` and
        // so can never be persisted through `PUT /internalapi/config` or
        // observed truthy in a real `safeConfig` -- confirmed by grepping
        // the Java config sources. "Send to downloader" is the one of the
        // bar's two primary actions genuinely reachable end-to-end here
        // (its downloader is real, via `configureSabnzbdMock()`); the ZIP
        // action's identical disabled-until-selected gating is instead
        // exhaustively covered by this task's own component tests in
        // SearchResults.test.tsx, which construct `safeConfig` directly.
        const now = Math.floor(Date.now() / 1_000);
        await page.route("**/internalapi/search", (route) =>
            route.fulfill({
                json: {
                    searchResults: [
                        {
                            searchResultId: "one",
                            title: "Bulk Actions Evidence Alpha",
                            indexer: "Alpha",
                            category: "TV",
                            size: 4 * 1024 * 1024,
                            seeders: 12,
                            epoch: now - 86_400,
                            age: "1 day",
                            downloadType: "NZB",
                        },
                        {
                            searchResultId: "two",
                            title: "Bulk Actions Evidence Bravo",
                            indexer: "Beta",
                            category: "Movies",
                            size: 6 * 1024 * 1024,
                            seeders: 5,
                            epoch: now - 2 * 86_400,
                            age: "2 days",
                            downloadType: "NZB",
                        },
                    ],
                    indexerSearchMetaDatas: [
                        {indexerName: "Alpha", wasSuccessful: true},
                        {indexerName: "Beta", wasSuccessful: true},
                    ],
                    indexerLimitWarnings: [],
                    rejectedReasonsMap: {},
                    notPickedIndexersWithReason: {},
                    numberOfAvailableResults: 2,
                    numberOfRejectedResults: 0,
                },
            }),
        );

        // Desktop, no selection: both primary actions render disabled
        // (native semantics, not merely a toast or opacity), the header
        // tri-state checkbox is unchecked and not indeterminate, and the
        // bar has no horizontal overflow.
        await prepareVisualEvidence(page, "desktop", async () => {
            await page.goto("/");
            await page
                .getByTestId("search-query")
                .fill("bulk actions evidence");
            await page.getByTestId("search-submit").click();
            await expect(page.getByTestId("search-status-modal")).toBeHidden();
            await expect(
                page.getByTestId("search-results-table"),
            ).toBeVisible();
        });

        const bar = page.getByTestId("results-bulk-actions");
        const send = page.getByTestId("send-to-downloader");
        const headerMenu = page.getByTestId("header-selection-menu");
        const headerCheckbox = headerMenu.getByRole("checkbox", {
            name: "Select all visible results",
        });

        await expect(send).toBeDisabled();
        await expect(headerCheckbox).not.toBeChecked();
        await expect(headerCheckbox).toHaveAttribute(
            "data-indeterminate",
            "false",
        );
        await expectVisualGeometry(page, {
            region: "bulk-actions-no-selection-desktop",
            locator: bar,
        });
        await captureVisualRegion(
            bar,
            "F-SEARCH-GROUP-SELECTION",
            "bulk-actions-desktop",
        );

        // The bar's bottom edge stays at or above the results table's top
        // edge (preserving F-SEARCH-RESULTS's existing toolbar-above-table
        // check), and it does not overlap the refine-sidebar at desktop.
        const table = page.getByTestId("search-results-table");
        const sidebar = page.getByTestId("refine-sidebar");
        const [barBox, tableBox, sidebarBox] = await Promise.all([
            bar.boundingBox(),
            table.boundingBox(),
            sidebar.boundingBox(),
        ]);
        expect(barBox).not.toBeNull();
        expect(tableBox).not.toBeNull();
        expect(sidebarBox).not.toBeNull();
        if (!barBox || !tableBox || !sidebarBox) {
            throw new Error("Bar/table/sidebar require deterministic geometry");
        }
        expect(barBox.y + barBox.height).toBeLessThanOrEqual(tableBox.y + 1);
        const overlapsSidebar =
            barBox.x < sidebarBox.x + sidebarBox.width &&
            barBox.x + barBox.width > sidebarBox.x &&
            barBox.y < sidebarBox.y + sidebarBox.height &&
            barBox.y + barBox.height > sidebarBox.y;
        expect(overlapsSidebar).toBe(false);

        // Selecting one row of several: header checkbox indeterminate, the
        // reachable primary action enabled, selected count shown with no
        // scrollWidth overflow of its own box.
        const rows = page.getByTestId("search-result-row");
        await expect(rows).toHaveCount(2);
        await rows.nth(0).getByRole("checkbox").check();
        await expect(headerCheckbox).not.toBeChecked();
        await expect(headerCheckbox).toHaveAttribute(
            "data-indeterminate",
            "true",
        );
        await expect(send).toBeEnabled();
        // FM-055: the selected count is rendered once, inside
        // `search-results-summary` (the former `results-selected-count`
        // duplicate in this row is gone).
        const summary = page.getByTestId("search-results-summary");
        await expect(summary).toContainText("· 1 selected");
        expect(
            await summary.evaluate(
                (element) => element.scrollWidth <= element.clientWidth,
            ),
        ).toBe(true);
        await expectVisualGeometry(page, {
            region: "bulk-actions-partial-selection-desktop",
            locator: bar,
        });

        // The open selection menu (opened via the header's caret) renders
        // fully within the viewport with no page horizontal overflow.
        const caret = headerMenu.getByRole("button", {
            name: "Selection options",
        });
        await caret.click();
        const menu = page.getByRole("menu");
        await expect(menu).toBeVisible();
        const menuBox = await menu.boundingBox();
        const desktopViewport = page.viewportSize();
        expect(menuBox).not.toBeNull();
        expect(desktopViewport).not.toBeNull();
        if (!menuBox || !desktopViewport) {
            throw new Error("Menu requires deterministic geometry");
        }
        expect(menuBox.x).toBeGreaterThanOrEqual(0);
        expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(
            desktopViewport.width,
        );
        expect(menuBox.y).toBeGreaterThanOrEqual(0);
        expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(
            desktopViewport.height,
        );
        expect(
            await page
                .locator("html")
                .evaluate(
                    (element) => element.scrollWidth <= element.clientWidth,
                ),
        ).toBe(true);

        // "Select all" produces exactly selectVisibleResults's "all"
        // outcome, asserted by the resulting selection state.
        await page
            .getByRole("menuitem", {name: "Select all", exact: true})
            .click();
        await expect(headerCheckbox).toBeChecked();
        await expect(headerCheckbox).toHaveAttribute(
            "data-indeterminate",
            "false",
        );
        await expect(summary).toContainText("· 2 selected");
        await expectVisualGeometry(page, {
            region: "bulk-actions-all-selected-desktop",
            locator: bar,
        });

        // Mobile: a fresh load starts with no stored preference.
        await page.evaluate(() => window.localStorage.clear());
        await prepareVisualEvidence(page, "mobile", async () => {
            await page.goto("/");
            await page
                .getByTestId("search-query")
                .fill("bulk actions evidence");
            await page.getByTestId("search-submit").click();
            await expect(page.getByTestId("search-status-modal")).toBeHidden();
            await expect(
                page.getByTestId("search-results-table"),
            ).toBeVisible();
        });

        const mobileBar = page.getByTestId("results-bulk-actions");
        await expect(page.getByTestId("send-to-downloader")).toBeDisabled();
        await expectVisualGeometry(page, {
            region: "bulk-actions-no-selection-mobile",
            locator: mobileBar,
        });
        await captureVisualRegion(
            mobileBar,
            "F-SEARCH-GROUP-SELECTION",
            "bulk-actions-mobile",
        );

        // Below `sm` the responsive table styling hides `thead` entirely,
        // so the header's selection menu is unreachable there; the
        // toolbar's merged `results-bulk-actions` row (FM-055) carries a
        // second, functionally-identical copy at its start so bulk selection
        // stays reachable at mobile -- asserted here, not merely assumed.
        await expect(
            page.getByTestId("header-selection-menu"),
        ).not.toBeVisible();
        const toolbarMenu = page.getByTestId("toolbar-selection-menu");
        await expect(toolbarMenu).toBeVisible();
        await toolbarMenu
            .getByRole("button", {name: "Selection options (mobile)"})
            .click();
        const mobileMenu = page.getByRole("menu");
        await expect(mobileMenu).toBeVisible();
        const mobileMenuBox = await mobileMenu.boundingBox();
        const mobileViewport = page.viewportSize();
        expect(mobileMenuBox).not.toBeNull();
        expect(mobileViewport).not.toBeNull();
        if (!mobileMenuBox || !mobileViewport) {
            throw new Error("Menu requires deterministic geometry");
        }
        expect(mobileMenuBox.x).toBeGreaterThanOrEqual(0);
        expect(mobileMenuBox.x + mobileMenuBox.width).toBeLessThanOrEqual(
            mobileViewport.width,
        );
        expect(
            await page
                .locator("html")
                .evaluate(
                    (element) => element.scrollWidth <= element.clientWidth,
                ),
        ).toBe(true);
        await page
            .getByRole("menuitem", {name: "Select all", exact: true})
            .click();
        await expect(page.getByTestId("send-to-downloader")).toBeEnabled();
        await expect(
            toolbarMenu.getByRole("checkbox", {
                name: "Select all visible results (mobile)",
            }),
        ).toBeChecked();
    });

    // FM-046: remediates FM-040's structure (reused unchanged, per this
    // task's own boundary rationale) to the mock's palette and density.
    // States: `toolbar-mock-density` (a flat, borderless results-toolbar at
    // the mock's own 16px 0 14px padding), `tri-state-checkbox-mock-square`
    // (the select-all checkbox's 17x17px, 5px-radius control at both its
    // unchecked and checked states), and `bulk-actions-mock-buttons` (the
    // primary/secondary bulk-action buttons' enabled-vs-disabled color
    // contrast and the caret menu's mock popover surface).
    test("should render the results toolbar and bulk-actions bar at the mock's density with a square tri-state checkbox and styled buttons", async ({
        hydra,
        page,
    }) => {
        await hydra.configureSabnzbdMock();
        const now = Math.floor(Date.now() / 1_000);
        await page.route("**/internalapi/search", (route) =>
            route.fulfill({
                json: {
                    searchResults: [
                        {
                            searchResultId: "one",
                            title: "Toolbar Mock Density Alpha",
                            indexer: "Alpha",
                            category: "TV",
                            size: 4 * 1024 * 1024,
                            seeders: 12,
                            epoch: now - 86_400,
                            age: "1 day",
                            downloadType: "NZB",
                        },
                        {
                            searchResultId: "two",
                            title: "Toolbar Mock Density Bravo",
                            indexer: "Beta",
                            category: "Movies",
                            size: 6 * 1024 * 1024,
                            seeders: 5,
                            epoch: now - 2 * 86_400,
                            age: "2 days",
                            downloadType: "NZB",
                        },
                    ],
                    indexerSearchMetaDatas: [
                        {indexerName: "Alpha", wasSuccessful: true},
                        {indexerName: "Beta", wasSuccessful: true},
                    ],
                    indexerLimitWarnings: [],
                    rejectedReasonsMap: {},
                    notPickedIndexersWithReason: {},
                    numberOfAvailableResults: 2,
                    numberOfRejectedResults: 0,
                },
            }),
        );

        await prepareVisualEvidence(page, "desktop", async () => {
            await page.goto("/");
            await page.getByTestId("search-query").fill("toolbar mock density");
            await page.getByTestId("search-submit").click();
            await expect(page.getByTestId("search-status-modal")).toBeHidden();
            await expect(
                page.getByTestId("search-results-table"),
            ).toBeVisible();
        });

        // `toolbar-mock-density`: no elevated Paper surface/border/shadow,
        // the mock's own 16px 0 14px padding, no horizontal overflow.
        const toolbar = page.getByTestId("results-toolbar");
        await expectVisualGeometry(page, {
            region: "toolbar-mock-density-desktop",
            locator: toolbar,
        });
        const toolbarStyle = await toolbar.evaluate((element) => {
            const style = getComputedStyle(element);
            return {
                borderWidth: style.borderTopWidth,
                boxShadow: style.boxShadow,
                paddingBottom: style.paddingBottom,
                paddingTop: style.paddingTop,
            };
        });
        expect(toolbarStyle.boxShadow).toBe("none");
        expect(toolbarStyle.borderWidth).toBe("0px");
        expect(toolbarStyle.paddingTop).toBe("16px");
        expect(toolbarStyle.paddingBottom).toBe("14px");
        await captureVisualRegion(
            toolbar,
            "F-SEARCH-GROUP-SELECTION",
            "toolbar-mock-density-desktop",
        );

        // `tri-state-checkbox-mock-square`: the header's select-all checkbox
        // renders within a few pixels of the mock's 17x17px target, unchecked
        // and checked, with no scrollWidth overflow of its own box.
        const headerMenu = page.getByTestId("header-selection-menu");
        const headerCheckbox = headerMenu.getByRole("checkbox", {
            name: "Select all visible results",
        });
        const expectSquareCheckboxGeometry = async () => {
            const box = await headerCheckbox.boundingBox();
            expect(box).not.toBeNull();
            if (!box) {
                throw new Error("Checkbox requires deterministic geometry");
            }
            expect(box.width).toBeGreaterThanOrEqual(14);
            expect(box.width).toBeLessThanOrEqual(20);
            expect(box.height).toBeGreaterThanOrEqual(14);
            expect(box.height).toBeLessThanOrEqual(20);
            expect(
                await headerCheckbox.evaluate(
                    (element) => element.scrollWidth <= element.clientWidth + 1,
                ),
            ).toBe(true);
        };
        await expectSquareCheckboxGeometry();
        await headerCheckbox.check();
        await expectSquareCheckboxGeometry();

        // The `search-results-summary`'s `· N selected` fragment renders
        // once something is selected.
        await expect(page.getByTestId("search-results-summary")).toContainText(
            "2 selected",
        );

        // `bulk-actions-mock-buttons`: the enabled "Send to downloader"
        // button's computed background differs measurably from both its own
        // disabled-state background and the page background.
        const send = page.getByTestId("send-to-downloader");
        await expect(send).toBeEnabled();
        const enabledBackground = await send.evaluate(
            (element) => getComputedStyle(element).backgroundColor,
        );
        const pageBackground = await page
            .locator("body")
            .evaluate((element) => getComputedStyle(element).backgroundColor);
        await headerCheckbox.uncheck();
        await expect(send).toBeDisabled();
        const disabledBackground = await send.evaluate(
            (element) => getComputedStyle(element).backgroundColor,
        );
        expect(enabledBackground).not.toBe(disabledBackground);
        expect(enabledBackground).not.toBe(pageBackground);
        expect(disabledBackground).not.toBe(pageBackground);
        await captureVisualRegion(
            page.getByTestId("results-bulk-actions"),
            "F-SEARCH-GROUP-SELECTION",
            "toolbar-mock-density-desktop-bulk-actions",
        );

        // The caret menu renders on the mock's popover surface, fully within
        // the viewport with no page horizontal overflow.
        const caret = headerMenu.getByRole("button", {
            name: "Selection options",
        });
        await caret.click();
        const menu = page.getByRole("menu");
        await expect(menu).toBeVisible();
        const menuSurface = await menu.evaluate((element) => {
            const paper = element.closest(".MuiPaper-root");
            return paper ? getComputedStyle(paper).backgroundColor : null;
        });
        expect(menuSurface).toBe("rgb(42, 49, 51)");
        const menuBox = await menu.boundingBox();
        const desktopViewport = page.viewportSize();
        expect(menuBox).not.toBeNull();
        expect(desktopViewport).not.toBeNull();
        if (!menuBox || !desktopViewport) {
            throw new Error("Menu requires deterministic geometry");
        }
        expect(menuBox.x).toBeGreaterThanOrEqual(0);
        expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(
            desktopViewport.width,
        );
        expect(menuBox.y).toBeGreaterThanOrEqual(0);
        expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(
            desktopViewport.height,
        );
        expect(
            await page
                .locator("html")
                .evaluate(
                    (element) => element.scrollWidth <= element.clientWidth,
                ),
        ).toBe(true);
        await page.keyboard.press("Escape");
        await expect(menu).toBeHidden();

        // Mobile: the same toolbar renders overflow-free at the mock's
        // density, the toolbar's mobile-reachable checkbox copy renders at
        // the same square target, and its caret menu stays fully within the
        // narrower viewport.
        await page.evaluate(() => window.localStorage.clear());
        await prepareVisualEvidence(page, "mobile", async () => {
            await page.goto("/");
            await page.getByTestId("search-query").fill("toolbar mock density");
            await page.getByTestId("search-submit").click();
            await expect(page.getByTestId("search-status-modal")).toBeHidden();
            await expect(
                page.getByTestId("search-results-table"),
            ).toBeVisible();
        });

        const mobileToolbar = page.getByTestId("results-toolbar");
        await expectVisualGeometry(page, {
            region: "toolbar-mock-density-mobile",
            locator: mobileToolbar,
        });
        await captureVisualRegion(
            mobileToolbar,
            "F-SEARCH-GROUP-SELECTION",
            "toolbar-mock-density-mobile",
        );

        const toolbarMenu = page.getByTestId("toolbar-selection-menu");
        const toolbarCheckbox = toolbarMenu.getByRole("checkbox", {
            name: "Select all visible results (mobile)",
        });
        const mobileBox = await toolbarCheckbox.boundingBox();
        expect(mobileBox).not.toBeNull();
        if (!mobileBox) {
            throw new Error("Checkbox requires deterministic geometry");
        }
        expect(mobileBox.width).toBeGreaterThanOrEqual(14);
        expect(mobileBox.width).toBeLessThanOrEqual(20);
        expect(mobileBox.height).toBeGreaterThanOrEqual(14);
        expect(mobileBox.height).toBeLessThanOrEqual(20);

        await toolbarMenu
            .getByRole("button", {name: "Selection options (mobile)"})
            .click();
        const mobileMenu = page.getByRole("menu");
        await expect(mobileMenu).toBeVisible();
        const mobileMenuBox = await mobileMenu.boundingBox();
        const mobileViewport = page.viewportSize();
        expect(mobileMenuBox).not.toBeNull();
        expect(mobileViewport).not.toBeNull();
        if (!mobileMenuBox || !mobileViewport) {
            throw new Error("Menu requires deterministic geometry");
        }
        expect(mobileMenuBox.x).toBeGreaterThanOrEqual(0);
        expect(mobileMenuBox.x + mobileMenuBox.width).toBeLessThanOrEqual(
            mobileViewport.width,
        );
        expect(
            await page
                .locator("html")
                .evaluate(
                    (element) => element.scrollWidth <= element.clientWidth,
                ),
        ).toBe(true);
    });

    // FM-041: the display-options popover and the two opt-in row treatments it
    // turns on. States: `display-menu-open`, `compact-rows-enabled`,
    // `recent-highlight-enabled`, and `sidebar-shortcut-toggled` (the popover's
    // "Show refine sidebar" entry as a second entry point to whichever
    // per-viewport refine-surface mechanism is live).
    test("should provide deterministic display-options, compact-row, recency, and sidebar-shortcut visual evidence across desktop and mobile", async ({
        page,
    }) => {
        const now = Math.floor(Date.now() / 1_000);
        await page.route("**/internalapi/search", (route) =>
            route.fulfill({
                json: {
                    searchResults: [
                        {
                            searchResultId: "one",
                            title: "Display Options Recent One",
                            indexer: "Alpha",
                            category: "Movies",
                            size: 4 * 1024 * 1024,
                            seeders: 12,
                            epoch: now - 86_400,
                            age: "1 day",
                            downloadType: "NZB",
                        },
                        {
                            searchResultId: "two",
                            title: "Display Options Recent Two",
                            indexer: "Beta",
                            category: "Movies",
                            size: 6 * 1024 * 1024,
                            seeders: 5,
                            epoch: now - 2 * 86_400,
                            age: "2 days",
                            downloadType: "NZB",
                        },
                        {
                            searchResultId: "three",
                            title: "Display Options Recent Three",
                            indexer: "Gamma",
                            category: "Movies",
                            size: 3 * 1024 * 1024,
                            seeders: 9,
                            // Deliberately just inside the three-day window
                            // rather than exactly on it: `ageInDays` reads
                            // `Date.now()` at sub-second precision, so an
                            // epoch exactly three days old lands a fraction of
                            // a day past the `<= 3` threshold.
                            epoch: now - 3 * 86_400 + 3_600,
                            age: "3 days",
                            downloadType: "NZB",
                        },
                        {
                            // This block's deliberately older result, so the
                            // recency distinction is assertable at all.
                            searchResultId: "four",
                            title: "Display Options Older Release",
                            indexer: "Alpha",
                            category: "Movies",
                            size: 5 * 1024 * 1024,
                            seeders: 2,
                            epoch: now - 40 * 86_400,
                            age: "40 days",
                            downloadType: "NZB",
                        },
                    ],
                    indexerSearchMetaDatas: [
                        {indexerName: "Alpha", wasSuccessful: true},
                        {indexerName: "Beta", wasSuccessful: true},
                        {indexerName: "Gamma", wasSuccessful: true},
                    ],
                    indexerLimitWarnings: [],
                    rejectedReasonsMap: {},
                    notPickedIndexersWithReason: {},
                    numberOfAvailableResults: 4,
                    numberOfRejectedResults: 0,
                },
            }),
        );

        await prepareVisualEvidence(page, "desktop", async () => {
            await page.goto("/");
            await page.getByTestId("search-query").fill("display options");
            await page.getByTestId("search-submit").click();
            await expect(page.getByTestId("search-status-modal")).toBeHidden();
            await expect(
                page.getByTestId("search-results-table"),
            ).toBeVisible();
        });

        const table = page.getByTestId("search-results-table");
        const sidebar = page.getByTestId("refine-sidebar");
        const sidebarToggle = page.getByTestId("refine-sidebar-toggle");
        const menuToggle = page.getByTestId("display-options-toggle");
        const rows = page.getByTestId("search-result-row");
        await expect(rows).toHaveCount(4);

        // `display-menu-open`: the toggle advertises its popover, and the open
        // popover renders on the mock's `#2a3133`/220px surface at the
        // theme's own raised-paper radius, fully inside the viewport with no
        // page horizontal overflow.
        await expect(menuToggle).toHaveAttribute("aria-haspopup", "true");
        await expect(menuToggle).toHaveAttribute("aria-expanded", "false");
        await expect(page.getByTestId("display-options")).toHaveCount(0);
        await openDisplayOptions(page);
        await expectDisplayMenuSurface(page);
        await captureVisualRegion(
            displayOptionsPaper(page),
            "F-SEARCH-RESULTS",
            "display-options-desktop",
        );

        // Every entry exposes an accessible name and a checked state, and both
        // new preferences default off, so the default rendering is unchanged.
        for (const [name, checked] of [
            ["Group torrent and Usenet results", false],
            ["Group TV episodes", true],
            ["Compact rows", false],
            ["Highlight recent", false],
            ["Show refine sidebar", true],
        ] as Array<[string, boolean]>) {
            const entry = page.getByRole("checkbox", {name, exact: true});
            await expect(entry).toBeVisible();
            if (checked) {
                await expect(entry).toBeChecked();
            } else {
                await expect(entry).not.toBeChecked();
            }
        }

        // `sidebar-shortcut-toggled` at desktop: the entry's checked state
        // matches the live `refine-sidebar-toggle`'s `aria-expanded`, and
        // toggling it from the menu produces the same rendered outcome the live
        // toggle produces.
        await expect(sidebarToggle).toHaveAttribute("aria-expanded", "true");
        await closeDisplayOptions(page);
        const expandedMetrics = await refineSurfaceMetrics(page);

        await toggleRefineSurfaceFromMenu(page);
        await expect(sidebarToggle).toHaveAttribute("aria-expanded", "false");
        expect(await displayOptionChecked(page, "Show refine sidebar")).toBe(
            false,
        );
        const menuCollapsedMetrics = await refineSurfaceMetrics(page);
        expect(menuCollapsedMetrics.sidebarWidth).toBeLessThan(
            expandedMetrics.sidebarWidth,
        );
        // The table takes back exactly the width the sidebar gave up, with no
        // residual gap between the two.
        expect(
            menuCollapsedMetrics.tableWidth - expandedMetrics.tableWidth,
        ).toBeCloseTo(
            expandedMetrics.sidebarWidth - menuCollapsedMetrics.sidebarWidth,
            0,
        );
        expect(menuCollapsedMetrics.gap).toBeLessThanOrEqual(17);

        // Back through the menu, then the same round trip through the live
        // toggle: both produce the identical rendered geometry.
        await toggleRefineSurfaceFromMenu(page);
        await expect(sidebarToggle).toHaveAttribute("aria-expanded", "true");
        expect(await refineSurfaceMetrics(page)).toEqual(expandedMetrics);
        await sidebarToggle.click();
        await expect(sidebarToggle).toHaveAttribute("aria-expanded", "false");
        expect(await refineSurfaceMetrics(page)).toEqual(menuCollapsedMetrics);
        expect(await displayOptionChecked(page, "Show refine sidebar")).toBe(
            false,
        );
        await sidebarToggle.click();
        await expect(sidebarToggle).toHaveAttribute("aria-expanded", "true");
        expect(await displayOptionChecked(page, "Show refine sidebar")).toBe(
            true,
        );

        // `compact-rows-enabled`: with both preferences off the body cells
        // carry exactly the 6px vertical padding FM-045 established before this
        // task, so the default row density is unchanged; enabling Compact rows
        // moves it to 4px and measurably shortens the table for the same
        // visible row count, and switching it back restores the original
        // height exactly.
        await expect(table).toHaveAttribute("data-compact-rows", "false");
        expect(await bodyCellPaddingY(page)).toEqual({
            paddingBottom: "6px",
            paddingTop: "6px",
        });
        const defaultTableHeight = await tableHeight(page);
        await expectNoTitleCellOverflow(page);

        await toggleDisplayOption(page, "Compact rows");
        await expect(table).toHaveAttribute("data-compact-rows", "true");
        expect(await bodyCellPaddingY(page)).toEqual({
            paddingBottom: "4px",
            paddingTop: "4px",
        });
        const compactTableHeight = await tableHeight(page);
        expect(compactTableHeight).toBeLessThan(defaultTableHeight);
        await expect(rows).toHaveCount(4);
        await expectNoTitleCellOverflow(page);
        await expectVisualGeometry(page, {
            region: "compact-rows-desktop",
            locator: table,
        });
        await captureCompactRows(page);

        await toggleDisplayOption(page, "Compact rows");
        await expect(table).toHaveAttribute("data-compact-rows", "false");
        expect(await tableHeight(page)).toBe(defaultTableHeight);

        // `recent-highlight-enabled`: a result at most three days old differs
        // from the older one in two properties, not by hue alone -- an
        // accent-teal age-column text color and a left-edge accent stripe the
        // older row does not draw -- and adds no overflow to the row.
        const recent = resultRow(page, "Display Options Recent One");
        const older = resultRow(page, "Display Options Older Release");
        expect(await recencyTreatment(recent)).toEqual(
            await recencyTreatment(older),
        );

        await toggleDisplayOption(page, "Highlight recent");
        const recentTreatment = await recencyTreatment(recent);
        const olderTreatment = await recencyTreatment(older);
        expect(recentTreatment.ageColor).not.toBe(olderTreatment.ageColor);
        expect(recentTreatment.stripe).toContain("inset");
        expect(olderTreatment.stripe).not.toContain("inset");
        expect(recentTreatment.noRowOverflow).toBe(true);
        for (const title of [
            "Display Options Recent Two",
            "Display Options Recent Three",
        ]) {
            expect(
                (await recencyTreatment(resultRow(page, title))).stripe,
            ).toContain("inset");
        }
        await expectVisualGeometry(page, {
            region: "recent-highlight-desktop",
            locator: table,
        });

        // Mobile: a deliberately stored *expanded* docked preference must not
        // pop the drawer open over the results, because the below-`sm` surface
        // is a transient overlay rather than that persisted preference.
        await page.evaluate(() =>
            window.localStorage.setItem(
                "hydra.search-results.table",
                JSON.stringify({sidebarCollapsed: false}),
            ),
        );
        await prepareVisualEvidence(page, "mobile", async () => {
            await page.goto("/");
            await page.getByTestId("search-query").fill("display options");
            await page.getByTestId("search-submit").click();
            await expect(page.getByTestId("search-status-modal")).toBeHidden();
            await expect(
                page.getByTestId("search-results-table"),
            ).toBeVisible();
        });

        const drawerTrigger = page.getByTestId("refine-sidebar-toggle");
        await expect(drawerTrigger).toHaveAttribute("aria-expanded", "false");
        await expect(sidebar).toHaveCount(0);
        await expect(page.getByTestId("refine-sidebar-drawer")).toHaveCount(0);

        await openDisplayOptions(page);
        await expectDisplayMenuSurface(page);
        await expect(
            page.getByRole("checkbox", {
                name: "Show refine sidebar",
                exact: true,
            }),
        ).not.toBeChecked();
        await closeDisplayOptions(page);
        const closedTableBox = await table.boundingBox();
        expect(closedTableBox).not.toBeNull();
        if (!closedTableBox) {
            throw new Error("Table requires deterministic geometry");
        }

        // The menu entry opens the same drawer FM-045's trigger opens, and the
        // closed table's box returns to exactly its previous value after each
        // of the four open/close operations a real user can reach here, with no
        // page horizontal overflow after any of them.
        //
        // Only four, and only in this pairing: below `sm` the refine surface is
        // a modal `Drawer`, so while it is open its backdrop legitimately
        // intercepts pointer events for everything beneath it -- including both
        // the display-options toggle and FM-045's own `refine-sidebar-toggle`.
        // The reachable operations are therefore {menu entry, trigger} to open
        // and `refine-sidebar-close` to close. The entry's *closing* direction
        // is exercised at desktop above (no modal there) and, at this viewport,
        // by `SearchResults.test.tsx`, which drives the same state without a
        // real pointer.
        await toggleRefineSurfaceFromMenu(page);
        await expect(drawerTrigger).toHaveAttribute("aria-expanded", "true");
        await expect(page.getByTestId("refine-sidebar-drawer")).toBeVisible();
        await expect(sidebar).toBeVisible();
        await expectNoPageOverflow(page);

        await page.getByTestId("refine-sidebar-close").click();
        await expect(drawerTrigger).toHaveAttribute("aria-expanded", "false");
        await expect(sidebar).toHaveCount(0);
        await expectSameClosedTableBox(page, closedTableBox);
        // The entry's checked state still answers "is the refine surface shown"
        // after the round trip, matching the live trigger's own aria-expanded.
        expect(await displayOptionChecked(page, "Show refine sidebar")).toBe(
            false,
        );

        await drawerTrigger.click();
        await expect(drawerTrigger).toHaveAttribute("aria-expanded", "true");
        await expect(sidebar).toBeVisible();
        await expectNoPageOverflow(page);
        await page.getByTestId("refine-sidebar-close").click();
        await expect(drawerTrigger).toHaveAttribute("aria-expanded", "false");
        await expect(sidebar).toHaveCount(0);
        await expectSameClosedTableBox(page, closedTableBox);
        expect(await displayOptionChecked(page, "Show refine sidebar")).toBe(
            false,
        );

        // Both row treatments stay overflow-free at the narrow viewport too.
        await toggleDisplayOption(page, "Compact rows");
        await toggleDisplayOption(page, "Highlight recent");
        await expect(table).toHaveAttribute("data-compact-rows", "true");
        await expectNoTitleCellOverflow(page);
        expect(
            (
                await recencyTreatment(
                    resultRow(page, "Display Options Recent One"),
                )
            ).stripe,
        ).toContain("inset");
        await expectNoPageOverflow(page);
        await expectVisualGeometry(page, {
            region: "compact-rows-mobile",
            locator: table,
        });
    });

    // FM-042: the results toolbar and table header stay pinned while the
    // document scrolls, matching the mock's own `position:sticky;top:0`
    // toolbar and `position:sticky;top:51px` header row directly beneath
    // it. `results-toolbar` (since FM-055 the whole consolidated region:
    // the summary/paging/display row and the merged results-bulk-actions
    // row) is the sticky
    // element, not its individual children -- a real browser scroll (not a
    // jsdom component test) is what caught that a per-child sticky design
    // detaches early, because each child's containing block would then be
    // `results-toolbar`'s own short box rather than the outer Stack that
    // also contains the table. States: `scrolled-sticky-toolbar-and-header`,
    // `scrolled-popover-above-sticky`.
    test("should keep the toolbar and header pinned while scrolled without overlap, with a derived offset and reachable popovers", async ({
        hydra,
        page,
    }) => {
        await hydra.configureSabnzbdMock();
        const now = Math.floor(Date.now() / 1_000);
        await page.route("**/internalapi/search", (route) =>
            route.fulfill({
                json: {
                    searchResults: Array.from({length: 24}, (_, index) => ({
                        searchResultId: `sticky-${index}`,
                        title: `Sticky Evidence Result ${String(
                            index + 1,
                        ).padStart(2, "0")}`,
                        indexer: index % 2 === 0 ? "Alpha" : "Beta",
                        category: index % 3 === 0 ? "TV" : "Movies",
                        size: (index + 1) * 1024 * 1024,
                        seeders: index + 1,
                        epoch: now - index * 86_400,
                        age: `${index} days`,
                        downloadType: "NZB",
                    })),
                    indexerSearchMetaDatas: [
                        {indexerName: "Alpha", wasSuccessful: true},
                        {indexerName: "Beta", wasSuccessful: true},
                    ],
                    indexerLimitWarnings: [],
                    rejectedReasonsMap: {},
                    notPickedIndexersWithReason: {},
                    numberOfAvailableResults: 24,
                    numberOfRejectedResults: 0,
                },
            }),
        );

        // FM-042 (ADR-0011 `Human Decision` item 3): `desktop-wide`
        // (1900x1000) evidences `scrolled-sticky-toolbar-and-header` and
        // `scrolled-popover-above-sticky` in addition to the retained
        // `desktop` (1280x800), which stays the width under the most
        // pressure and so keeps every other geometry assertion below.
        for (const viewport of ["desktop", "desktop-wide", "mobile"] as const) {
            await prepareVisualEvidence(page, viewport, async () => {
                await page.goto("/");
                await page.getByTestId("search-query").fill("sticky evidence");
                await page.getByTestId("search-submit").click();
                await expect(
                    page.getByTestId("search-status-modal"),
                ).toBeHidden();
                await expect(
                    page.getByTestId("search-results-table"),
                ).toBeVisible();
            });
            await expect(page.getByTestId("search-result-row")).toHaveCount(24);

            const toolbar = page.getByTestId("results-toolbar");

            // Unscrolled, the toolbar renders at its normal in-flow height
            // -- this is the "toolbar's actual rendered height" the header
            // offset must be derived from, measured fresh against this
            // fixture (a configured downloader plus 24 rows) rather than
            // assumed as a constant.
            const toolbarBox0 = await toolbar.boundingBox();
            expect(toolbarBox0).not.toBeNull();
            if (!toolbarBox0) {
                throw new Error("Toolbar requires deterministic geometry");
            }
            const expectedHeaderTop = toolbarBox0.height;

            // Scroll proportionally to the page's own content height rather
            // than a fixed pixel amount, so this holds regardless of exact
            // row/toolbar heights: far enough that several rows pass
            // beneath the sticky regions, with rows still visible below.
            const scrollHeight = await page.evaluate(
                () => document.body.scrollHeight,
            );
            await page.evaluate(
                (y) => window.scrollTo(0, y),
                Math.floor(scrollHeight * 0.4),
            );

            const toolbarBox = await toolbar.boundingBox();
            expect(toolbarBox).not.toBeNull();
            if (!toolbarBox) {
                throw new Error("Toolbar requires deterministic geometry");
            }
            // The toolbar pins at the viewport's top edge, matching the
            // mock's own `position:sticky;top:0`, and its rendered height is
            // unchanged by scrolling.
            expect(toolbarBox.y).toBeCloseTo(0, 0);
            expect(toolbarBox.height).toBeCloseTo(toolbarBox0.height, 0);
            const stickyRegionBottom = toolbarBox.y + toolbarBox.height;

            // Every region inside the pinned toolbar renders within the
            // pinned box, not scrolled away underneath it. Since FM-055 that
            // is exactly the two rows: the summary (with its paging and
            // display controls) and the merged action row.
            for (const testId of [
                "search-results-summary",
                "results-bulk-actions",
                "results-load-more",
                "results-load-all",
            ]) {
                const box = await page.getByTestId(testId).boundingBox();
                expect(box).not.toBeNull();
                if (box) {
                    expect(box.y).toBeGreaterThanOrEqual(-1);
                    expect(box.y + box.height).toBeLessThanOrEqual(
                        stickyRegionBottom + 1,
                    );
                }
            }

            if (viewport !== "mobile") {
                // `desktop` and `desktop-wide` are both above the stacking
                // breakpoint, so both render a docked sidebar and a pinned
                // column header; the same assertions apply to each.
                // The header row's top sits at or below the toolbar's
                // bottom edge, and its computed `top` offset equals the
                // toolbar's own measured height -- derived, not a
                // hardcoded constant (a different fixture/viewport would
                // measure a different value here).
                const headerCell = page
                    .getByTestId("sort-title")
                    .locator("xpath=ancestor::*[self::th][1]");
                const headerBox = await headerCell.boundingBox();
                expect(headerBox).not.toBeNull();
                if (!headerBox) {
                    throw new Error(
                        "Header cell requires deterministic geometry",
                    );
                }
                expect(headerBox.y).toBeGreaterThanOrEqual(
                    stickyRegionBottom - 1,
                );
                expect(headerBox.y).toBeCloseTo(expectedHeaderTop, 0);
                const headerTopStyle = await headerCell.evaluate((element) =>
                    parseFloat(getComputedStyle(element).top),
                );
                expect(headerTopStyle).toBeCloseTo(expectedHeaderTop, 0);

                // No data row's top edge sits above the header row's bottom
                // edge while scrolled, and several rows have scrolled out
                // from under the sticky regions with visible rows remaining
                // beneath the header. A row's own DOM position does not
                // move -- it is the sticky regions that paint over it -- so
                // continuous scrolling can freeze mid-transition on a row
                // whose box straddles the header's bottom edge (bottom > 0
                // but top still less than it): such a row is entirely
                // hidden behind the opaque sticky regions, not "visible" in
                // the sense this check means. Filtering directly on "top at
                // or past the header's bottom edge" (rather than filtering
                // on generic viewport visibility and then asserting the
                // same relationship as a separate step) folds the
                // no-row-above-the-header invariant into the definition of
                // "visible below the header", so a straddling row is
                // correctly excluded instead of failing the assertion.
                const rowRects = await visibleRowRects(page);
                const stickyRegionBottomDesktop =
                    headerBox.y + headerBox.height;
                const scrolledPastCount = rowRects.filter(
                    (rect) => rect.bottom <= stickyRegionBottomDesktop,
                ).length;
                expect(scrolledPastCount).toBeGreaterThanOrEqual(3);
                const visibleRows = rowRects.filter(
                    (rect) =>
                        rect.top >= stickyRegionBottomDesktop - 1 &&
                        rect.top < (page.viewportSize()?.height ?? 0),
                );
                expect(visibleRows.length).toBeGreaterThan(0);

                // The docked refine-sidebar is not overlapped by or hidden
                // behind the sticky regions. `results-toolbar` spans the
                // full page width, above *both* columns (it is a sibling
                // of, not scoped to, the sidebar+table row below it), so
                // its own `x` is not the relevant boundary here -- the
                // existing unscrolled-state contract's own phrasing
                // ("the sidebar's right edge sits at or left of the table's
                // left edge", `FEATURES.yaml:222`/`:269`) is: the sidebar
                // stays left of the table column, scrolled or not.
                //
                // FM-055: the sidebar is itself pinned now, directly beneath
                // the sticky toolbar and no longer scrolling away with the
                // rows. Asserted here rather than assumed: while scrolled it
                // sits at the toolbar's bottom edge, its box fits within the
                // remaining viewport height, and it is its own scroll
                // container (`overflow-y: auto`) rather than a scrolling
                // ancestor of the table.
                const sidebar = page.getByTestId("refine-sidebar");
                const sidebarBox = await sidebar.boundingBox();
                const tableBox = await page
                    .getByTestId("search-results-table")
                    .boundingBox();
                expect(sidebarBox).not.toBeNull();
                expect(tableBox).not.toBeNull();
                if (sidebarBox && tableBox) {
                    expect(sidebarBox.x + sidebarBox.width).toBeLessThanOrEqual(
                        tableBox.x + 1,
                    );
                    expect(sidebarBox.y).toBeCloseTo(stickyRegionBottom, 0);
                    expect(
                        sidebarBox.y + sidebarBox.height,
                    ).toBeLessThanOrEqual(
                        (page.viewportSize()?.height ?? 0) + 1,
                    );
                }
                const sidebarStyle = await sidebar.evaluate((element) => {
                    const style = getComputedStyle(element);
                    return {
                        overflowY: style.overflowY,
                        position: style.position,
                        top: style.top,
                    };
                });
                expect(sidebarStyle.position).toBe("sticky");
                expect(sidebarStyle.overflowY).toBe("auto");
                expect(parseFloat(sidebarStyle.top)).toBeCloseTo(
                    expectedHeaderTop,
                    0,
                );

                if (viewport === "desktop") {
                    // ADR-0011's `box-shadow`-on-`<th>` remedy for a sticky
                    // header's bottom edge under `border-collapse: collapse`
                    // (rather than switching to `separate`, which would
                    // disturb FM-041's inset recency stripe): verified here,
                    // while scrolled, against this Chromium build rather than
                    // assumed from folklore. The recency stripe itself is
                    // checked further below, after `Highlight recent` is
                    // switched on.
                    const shadowCheck = await page.evaluate(() => {
                        const table = document.querySelector(
                            '[data-testid="search-results-table"]',
                        );
                        const th = document
                            .querySelector('[data-testid="sort-title"]')
                            ?.closest("th");
                        if (!table || !th) {
                            return null;
                        }
                        return {
                            borderCollapse:
                                getComputedStyle(table).borderCollapse,
                            thBoxShadow: getComputedStyle(th).boxShadow,
                        };
                    });
                    expect(shadowCheck).not.toBeNull();
                    expect(shadowCheck?.borderCollapse).toBe("collapse");
                    expect(shadowCheck?.thBoxShadow).not.toBe("none");
                }

                // `scrolled-popover-above-sticky`: FM-046's header caret
                // selection menu, opened while scrolled, is fully clickable
                // (Playwright's real actionability checks fail if a
                // higher-stacked sticky region actually covered it) and
                // fully within the viewport.
                const headerMenu = page.getByTestId("header-selection-menu");
                await headerMenu
                    .getByRole("button", {name: "Selection options"})
                    .click();
                const menu = page.getByRole("menu");
                await expect(menu).toBeVisible();
                await expectMenuFullyInViewport(page, menu);
                await menu
                    .getByRole("menuitem", {name: "Select all", exact: true})
                    .click();
                await expect(headerMenu.getByRole("checkbox")).toBeChecked();

                // FM-041's display-options menu, opened while scrolled, is
                // likewise fully clickable and within the viewport.
                await openDisplayOptions(page);
                await expectMenuFullyInViewport(
                    page,
                    displayOptionsPaper(page),
                );
                await page
                    .getByRole("checkbox", {
                        name: "Compact rows",
                        exact: true,
                    })
                    .click();
                // FM-041's `Highlight recent` opt-in, toggled on here (its
                // own default-off state is unaffected -- this is a
                // scrolled-state-only check) so the box-shadow remedy above
                // can be confirmed against a real recency-flagged row's
                // inset stripe, not only against the header's own shadow.
                await page
                    .getByRole("checkbox", {
                        name: "Highlight recent",
                        exact: true,
                    })
                    .click();
                await closeDisplayOptions(page);
                await expect(
                    page.getByTestId("search-results-table"),
                ).toHaveAttribute("data-compact-rows", "true");

                if (viewport === "desktop") {
                    // `Sticky Evidence Result 01` (index 0, `epoch: now`) is
                    // within FM-041's three-day recency window. Its own
                    // visibility is irrelevant here (it has very likely
                    // scrolled out from under the sticky regions by now,
                    // same as any other early row) -- the stripe is a
                    // computed style on its first cell, checked directly
                    // rather than through a bounding box.
                    const stripeBoxShadow = await page.evaluate(() => {
                        const row = document.querySelector(
                            '[data-result-title="Sticky Evidence Result 01"]',
                        );
                        const firstCell = row?.querySelector("td");
                        return firstCell
                            ? getComputedStyle(firstCell).boxShadow
                            : null;
                    });
                    expect(stripeBoxShadow).not.toBeNull();
                    expect(stripeBoxShadow).not.toBe("none");
                }
            } else {
                // Below `sm` the responsive table styling hides `thead`
                // entirely, so only the toolbar sticks; the sticky region is
                // at most 40% of the 390x844 viewport with at least two rows
                // visible beneath it.
                expect(stickyRegionBottom).toBeLessThanOrEqual(
                    (page.viewportSize()?.height ?? 0) * 0.4,
                );
                // See the desktop branch's identical comment above: filter
                // directly on "top at or past the sticky region's bottom
                // edge" rather than on generic viewport visibility, so a row
                // whose box straddles that edge (hidden behind the opaque
                // sticky toolbar, not actually visible) is excluded rather
                // than failing a separate assertion.
                const rowRects = await visibleRowRects(page);
                const visibleRows = rowRects.filter(
                    (rect) =>
                        rect.top >= stickyRegionBottom - 1 &&
                        rect.top < (page.viewportSize()?.height ?? 0),
                );
                expect(visibleRows.length).toBeGreaterThanOrEqual(2);

                // The display-options menu (reachable below `sm`, since the
                // header and its caret menu are hidden entirely) stays
                // clickable and within the viewport while scrolled.
                await openDisplayOptions(page);
                await expectMenuFullyInViewport(
                    page,
                    displayOptionsPaper(page),
                );
                await closeDisplayOptions(page);
            }

            await expectNoPageOverflow(page);
            // A viewport-clipped page screenshot (not `captureVisualRegion`'s
            // element screenshot, which would scroll to capture the full
            // scrollable element rather than the current scrolled state):
            // this is deliberately evidence of what the scrolled viewport
            // itself renders -- the pinned toolbar/header plus the rows
            // visible beneath them.
            await page.screenshot({
                path: visualEvidencePath(
                    "F-SEARCH-RESULTS",
                    `sticky-header-${viewport}`,
                ),
            });
        }
    });

    // FM-042 (ADR-0011): the re-proportioned `<colgroup>` and the mock's
    // header-label typography are only "aligned work" if every labelled
    // header genuinely fits -- this is the check that makes that
    // measurable rather than aspirational, at both evidence viewports and
    // both sidebar states, plus the ancestor-overflow-chain check that
    // proves no scrolling ancestor exists between a sticky `<th>` and the
    // document (the mechanism the whole Option E scroll model rests on).
    // Realistic, not synthetic, indexer/category values -- longer than a
    // single short word -- since ADR-0011 flags a long metadata value's fit
    // as unmeasured.
    test("should render every column header's full label without scrollWidth overflow, and no scrolling ancestor between a sticky header and the document, at both evidence viewports and sidebar states", async ({
        page,
    }) => {
        await page.route("**/internalapi/search", (route) =>
            route.fulfill({
                json: {
                    searchResults: [
                        {
                            searchResultId: "fit-0",
                            title: "Fit.Check.Result.0.1080p.WEB-DL.x265-GROUP",
                            indexer: "DrunkenSlug",
                            category: "Movies/HD",
                            size: 10 * 1024 * 1024 * 1024,
                            seeders: 987,
                            epoch: Math.floor(Date.now() / 1_000) - 20 * 86_400,
                            age: "3 weeks",
                            downloadType: "NZB",
                        },
                        {
                            searchResultId: "fit-1",
                            title: "Fit.Check.Result.1.1080p.WEB-DL.x265-GROUP",
                            indexer: "omgwtfnzbs",
                            category: "TV/x264/HD",
                            size: 700 * 1024 * 1024,
                            seeders: 12,
                            epoch: Math.floor(Date.now() / 1_000) - 86_400,
                            age: "1 day",
                            downloadType: "NZB",
                        },
                    ],
                    indexerSearchMetaDatas: [
                        {indexerName: "DrunkenSlug", wasSuccessful: true},
                        {indexerName: "omgwtfnzbs", wasSuccessful: true},
                    ],
                    indexerLimitWarnings: [],
                    rejectedReasonsMap: {},
                    notPickedIndexersWithReason: {},
                    numberOfAvailableResults: 2,
                    numberOfRejectedResults: 0,
                },
            }),
        );

        for (const viewport of ["desktop", "desktop-wide"] as const) {
            await prepareVisualEvidence(page, viewport, async () => {
                await page.goto("/");
                await page.getByTestId("search-query").fill("fit check");
                await page.getByTestId("search-submit").click();
                await expect(
                    page.getByTestId("search-status-modal"),
                ).toBeHidden();
                await expect(
                    page.getByTestId("search-results-table"),
                ).toBeVisible();
            });

            for (const sidebarCollapsed of [false, true]) {
                const toggle = page.getByTestId("refine-sidebar-toggle");
                const expanded =
                    (await toggle.getAttribute("aria-expanded")) === "true";
                if (expanded === sidebarCollapsed) {
                    await toggle.click();
                }
                await expect(toggle).toHaveAttribute(
                    "aria-expanded",
                    sidebarCollapsed ? "false" : "true",
                );

                const fit = await measureHeaderFit(page);
                for (const cell of fit.cells) {
                    expect(
                        cell.cellScrollWidth,
                        `${cell.label} cell at ${viewport}, sidebar ${
                            sidebarCollapsed ? "collapsed" : "expanded"
                        }`,
                    ).toBeLessThanOrEqual(cell.cellClientWidth);
                    expect(
                        cell.targetScrollWidth,
                        `${cell.label} target at ${viewport}, sidebar ${
                            sidebarCollapsed ? "collapsed" : "expanded"
                        }`,
                    ).toBeLessThanOrEqual(cell.targetClientWidth);
                    expect(cell.text?.startsWith(cell.expectedLabel)).toBe(
                        true,
                    );
                }
                expect(fit.tableScrollWidth).toBeLessThanOrEqual(
                    fit.tableClientWidth,
                );
                await expectNoPageOverflow(page);

                // No element between a sticky header `<th>` and
                // `documentElement` has a non-`visible` computed
                // `overflow-x`/`overflow-y` -- proof, not inference from
                // `AppShell.tsx`/`router.tsx`, that Option E's deleted
                // `overflowX: "auto"` wrapper left no scrolling ancestor.
                const ancestorOverflows = await page.evaluate(() => {
                    const th = document
                        .querySelector('[data-testid="sort-title"]')
                        ?.closest("th");
                    const overflows: Array<{
                        tag: string;
                        overflowX: string;
                        overflowY: string;
                    }> = [];
                    let node: Element | null = th?.parentElement ?? null;
                    while (node) {
                        const style = getComputedStyle(node);
                        overflows.push({
                            tag: node.tagName,
                            overflowX: style.overflowX,
                            overflowY: style.overflowY,
                        });
                        node = node.parentElement;
                    }
                    return overflows;
                });
                expect(ancestorOverflows.length).toBeGreaterThan(0);
                for (const ancestor of ancestorOverflows) {
                    expect(ancestor.overflowX, ancestor.tag).toBe("visible");
                    expect(ancestor.overflowY, ancestor.tag).toBe("visible");
                }
            }
        }
    });

    // FM-042 (ADR-0011, sub-decision E-title (i)): `fluid-table-title-
    // collapse`. A long, dot-separated (no spaces) release title wraps
    // across multiple lines via `overflow-wrap: anywhere` instead of
    // ellipsizing or spilling, at the viewport that puts it under pressure
    // (1280x800); captured again at 1900x1000, where the same title is
    // expected not to need wrapping, so the collapse behavior is evidenced
    // at both ends per this task's Acceptance.
    test("should wrap a long dot-separated title across multiple lines without truncating it, and not need to at 1900x1000", async ({
        page,
    }) => {
        const longTitle =
            // Measured (see the handoff) to wrap across two line boxes at
            // 1280x800's title column width and render on a single line at
            // 1900x1000's, so the same fixture value evidences both ends of
            // the collapse behavior the two viewports are captured for.
            "A.Somewhat.Long.Release.Name.1080p.WEB-DL.x265-GROUP";
        await page.route("**/internalapi/search", (route) =>
            route.fulfill({
                json: {
                    searchResults: [
                        {
                            searchResultId: "collapse-0",
                            title: longTitle,
                            indexer: "DrunkenSlug",
                            category: "Movies/HD",
                            size: 5 * 1024 * 1024,
                            seeders: 3,
                            epoch: Math.floor(Date.now() / 1_000),
                            age: "0 days",
                            downloadType: "NZB",
                        },
                    ],
                    indexerSearchMetaDatas: [
                        {indexerName: "DrunkenSlug", wasSuccessful: true},
                    ],
                    indexerLimitWarnings: [],
                    rejectedReasonsMap: {},
                    notPickedIndexersWithReason: {},
                    numberOfAvailableResults: 1,
                    numberOfRejectedResults: 0,
                },
            }),
        );

        for (const viewport of ["desktop", "desktop-wide"] as const) {
            await prepareVisualEvidence(page, viewport, async () => {
                await page.goto("/");
                await page.getByTestId("search-query").fill("title collapse");
                await page.getByTestId("search-submit").click();
                await expect(
                    page.getByTestId("search-status-modal"),
                ).toBeHidden();
                await expect(
                    page.getByTestId("search-results-table"),
                ).toBeVisible();
            });

            const titleCell = page.getByTestId("search-result-title");
            await expect(titleCell).toBeVisible();
            const row = page.getByTestId("search-result-row");
            await expect(row).toHaveAttribute("data-result-title", longTitle);
            expect(await titleCell.getAttribute("title")).toBeNull();

            // The row's own height is set by the tallest cell in the row
            // (checkbox, action buttons, etc.), not by the title text alone
            // -- confirmed by measurement: a single-word title's cell is
            // already far taller than one line box. So "did this title
            // wrap" has to be read off the title's own inner text box (the
            // Stack's Box that renders `column.value(result)`, the only
            // child once the group/duplicate expand buttons are absent),
            // not off the `<td>`'s rendered height.
            const geometry = await titleCell.evaluate((element) => {
                const stack = element.firstElementChild;
                const box = stack?.lastElementChild;
                if (!box) {
                    throw new Error("Title cell's inner Box not found");
                }
                return {
                    scrollWidth: element.scrollWidth,
                    clientWidth: element.clientWidth,
                    boxHeight: box.getBoundingClientRect().height,
                    lineHeight: parseFloat(getComputedStyle(box).lineHeight),
                };
            });
            expect(geometry.scrollWidth).toBeLessThanOrEqual(
                geometry.clientWidth,
            );
            if (viewport === "desktop") {
                // 1280x800: the title is under enough pressure to need more
                // than one line box.
                expect(geometry.boxHeight).toBeGreaterThan(
                    geometry.lineHeight * 1.5,
                );
            } else {
                // 1900x1000: the design target width, where this title is
                // expected not to need wrapping.
                expect(geometry.boxHeight).toBeLessThanOrEqual(
                    geometry.lineHeight * 1.5,
                );
            }

            await expectNoPageOverflow(page);
            await page.screenshot({
                path: visualEvidencePath(
                    "F-SEARCH-RESULTS",
                    `fluid-table-title-collapse-${viewport}`,
                ),
            });
        }
    });

    // FM-042 (ADR-0011, `useCompactRefineSurface()`): the table's stacked-
    // card breakpoint and the sidebar's docked/drawer breakpoint move
    // together, off `sm` (600px) to the shared raw-768px threshold. Evidence
    // both sides: a few pixels below renders stacked cards with no docked
    // sidebar, a few pixels above renders a table with a pinned header and
    // a docked sidebar.
    test("should switch the table and sidebar between stacked/drawer and table/docked together, at the same width", async ({
        page,
    }) => {
        await page.route("**/internalapi/search", (route) =>
            route.fulfill({
                json: {
                    searchResults: [
                        {
                            searchResultId: "bp-0",
                            title: "Breakpoint.Check.Result.1080p.WEB-DL-GROUP",
                            indexer: "DrunkenSlug",
                            category: "Movies",
                            size: 5 * 1024 * 1024,
                            seeders: 3,
                            epoch: Math.floor(Date.now() / 1_000),
                            age: "0 days",
                            downloadType: "NZB",
                        },
                    ],
                    indexerSearchMetaDatas: [
                        {indexerName: "DrunkenSlug", wasSuccessful: true},
                    ],
                    indexerLimitWarnings: [],
                    rejectedReasonsMap: {},
                    notPickedIndexersWithReason: {},
                    numberOfAvailableResults: 1,
                    numberOfRejectedResults: 0,
                },
            }),
        );

        for (const width of [758, 780]) {
            await page.setViewportSize({width, height: 800});
            await page.goto("/");
            await page.getByTestId("search-query").fill("breakpoint check");
            await page.getByTestId("search-submit").click();
            await expect(
                page.getByTestId("search-results-table"),
            ).toBeVisible();

            const thead = page.locator(
                '[data-testid="search-results-table"] thead',
            );
            const stacked = !(await thead.isVisible());
            const dockedSidebar = await page
                .getByTestId("refine-sidebar")
                .isVisible();
            const drawerTrigger = page.getByTestId("refine-sidebar-toggle");

            if (width < 768) {
                expect(stacked).toBe(true);
                expect(dockedSidebar).toBe(false);
                await expect(drawerTrigger).toHaveAttribute(
                    "aria-expanded",
                    "false",
                );
            } else {
                expect(stacked).toBe(false);
                expect(dockedSidebar).toBe(true);
            }
            await expectNoPageOverflow(page);
        }
    });

    // FM-055: the consolidated two-row toolbar and the viewport-pinned refine
    // sidebar. Six evidenced states across the two evidence viewports: the
    // toolbar with rejected results, popover closed and open; the toolbar
    // without rejected results; the sidebar taller than the viewport, with its
    // own scrollbar; the sidebar fitting the viewport and staying fully
    // visible while the results scroll; and the mobile refine drawer,
    // unregressed.
    test("should consolidate the results toolbar and pin the refine sidebar, with reachable rejection reasons", async ({
        hydra,
        page,
    }) => {
        await hydra.configureSabnzbdMock();
        const now = Math.floor(Date.now() / 1_000);
        // One interception, re-aimed between states through this mutable
        // fixture selector, so no route ever has to be unregistered.
        // `spread` is how many distinct indexers/categories the refine
        // sidebar's two toggle lists have to render, which is what decides
        // whether the sidebar is taller than the space the sticky toolbar
        // leaves it.
        const fixture = {rejected: true, spread: 12, withDownloadType: true};
        await page.route("**/internalapi/search", (route) =>
            route.fulfill({
                json: {
                    searchResults: Array.from({length: 28}, (_, index) => {
                        const suffix = String.fromCharCode(
                            65 + (index % fixture.spread),
                        );
                        return {
                            searchResultId: `fm055-${index}`,
                            title: `FM055 Toolbar Evidence ${String(
                                index + 1,
                            ).padStart(2, "0")}`,
                            indexer: `Indexer ${suffix}`,
                            category: `Category ${suffix}`,
                            size: (index + 1) * 1024 * 1024,
                            seeders: index + 1,
                            epoch: now - index * 86_400,
                            age: `${index} days`,
                            ...(fixture.withDownloadType
                                ? {downloadType: "NZB"}
                                : {}),
                        };
                    }),
                    indexerSearchMetaDatas: [
                        {
                            indexerName: "Alpha",
                            wasSuccessful: true,
                            hasMoreResults: true,
                            totalResultsKnown: false,
                        },
                    ],
                    indexerLimitWarnings: [],
                    rejectedReasonsMap: fixture.rejected
                        ? {
                              "Duplicate of another result": 61,
                              "Too small: 12 MB < 50 MB": 24,
                              "Forbidden word: x264": 13,
                          }
                        : {},
                    notPickedIndexersWithReason: {},
                    numberOfAvailableResults: 500,
                    numberOfRejectedResults: fixture.rejected ? 98 : 0,
                    numberOfProcessedResults: 28,
                    pagingState: "ready",
                    offset: 0,
                    limit: 28,
                },
            }),
        );
        const search = async (
            viewport: "desktop" | "mobile",
            options: Partial<typeof fixture> = {},
        ) => {
            Object.assign(fixture, options);
            await prepareVisualEvidence(page, viewport, async () => {
                await page.goto("/");
                await page
                    .getByTestId("search-query")
                    .fill("fm055 toolbar evidence");
                await page.getByTestId("search-submit").click();
                await expect(
                    page.getByTestId("search-status-modal"),
                ).toBeHidden();
                await expect(
                    page.getByTestId("search-results-table"),
                ).toBeVisible();
            });
        };

        const toolbar = page.getByTestId("results-toolbar");
        const summary = page.getByTestId("search-results-summary");
        const sidebar = page.getByTestId("refine-sidebar");

        for (const viewport of ["desktop", "mobile"] as const) {
            // --- consolidated toolbar, with rejected results ---------------
            await search(viewport, {rejected: true});

            // Exactly two rows, in the packet's order.
            const rowCount = await toolbar.evaluate(
                (element) => element.firstElementChild?.childElementCount ?? 0,
            );
            expect(rowCount).toBe(2);
            await expect(summary).toContainText(
                "28 of 28 loaded (>500 available) · 98 rejected",
            );
            await expect(page.getByTestId("results-load-more")).toBeVisible();
            await expect(page.getByTestId("results-load-all")).toBeVisible();
            await expect(
                page.getByTestId("display-options-toggle"),
            ).toBeVisible();
            // Every merged row-2 capability stays reachable, none behind an
            // overflow menu.
            const actions = page.getByTestId("results-bulk-actions");
            await expect(
                actions.getByTestId("send-to-downloader"),
            ).toBeVisible();
            // Both `Select`s moved into this row -- except the downloader
            // select itself, which this instance's single configured
            // downloader (`Deterministic SABnzbd`) makes redundant: it's
            // already the only option, so it's hidden entirely, leaving just
            // the downloader-category select. It's addressed by its rendered
            // input root rather than by accessible name: MUI applies a
            // `Select`'s `aria-label` to the hidden native input, not to the
            // visible `role="combobox"` node, so it carries no queryable name
            // (a pre-existing gap this task does not touch --
            // `focus-indication.spec.ts` addresses the same control the same
            // way).
            const selects = actions.locator(".MuiInputBase-root");
            await expect(selects).toHaveCount(1);
            // The ZIP button is config-gated (`showResultsAsZipButton`, off in
            // this instance) and covered by the component test instead; every
            // capability this instance's configuration does render is asserted
            // present in the merged row.
            for (const name of [
                "Send selected to black hole",
                "Copy selected links",
                "Save search",
            ]) {
                await expect(actions.getByRole("button", {name})).toBeVisible();
            }
            // The removed ids are gone everywhere in the document.
            for (const removed of [
                "results-bulk-actions-summary",
                "results-selected-count",
                "results-selection-actions",
                "results-download-actions",
            ]) {
                await expect(page.getByTestId(removed)).toHaveCount(0);
            }
            await expectVisualGeometry(page, {
                region: `fm055-toolbar-rejected-${viewport}`,
                locator: toolbar,
            });
            await captureVisualRegion(
                toolbar,
                "F-SEARCH-RESULTS",
                `fm055-toolbar-rejected-closed-${viewport}`,
            );

            // The rejection-reason breakdown, restoring legacy parity.
            const trigger = summary.getByTestId("results-rejected-trigger");
            await expect(trigger).toHaveText("98 rejected");
            await expect(trigger).toHaveAttribute("aria-expanded", "false");
            await trigger.click();
            const popover = page.getByTestId("results-rejected-popover");
            await expect(popover).toBeVisible();
            await expect(trigger).toHaveAttribute("aria-expanded", "true");
            expect(
                await popover.evaluate((element) =>
                    [...element.querySelectorAll("li")].map(
                        (item) => item.textContent ?? "",
                    ),
                ),
            ).toEqual([
                "61Duplicate of another result",
                "24Too small: 12 MB < 50 MB",
                "13Forbidden word: x264",
            ]);
            await page.screenshot({
                path: visualEvidencePath(
                    "F-SEARCH-RESULTS",
                    `fm055-toolbar-rejected-open-${viewport}`,
                ),
            });
            await page.keyboard.press("Escape");
            await expect(popover).toHaveCount(0);
            await expectNoPageOverflow(page);

            if (viewport === "desktop") {
                // --- sidebar taller than the viewport ----------------------
                await openRefineSidebar(page);
                const tall = await sidebar.evaluate((element) => ({
                    clientHeight: element.clientHeight,
                    overflowY: getComputedStyle(element).overflowY,
                    scrollHeight: element.scrollHeight,
                }));
                // Its own scroll container, not the document's.
                expect(tall.overflowY).toBe("auto");
                expect(tall.scrollHeight).toBeGreaterThan(tall.clientHeight);
                await sidebar.evaluate((element) => {
                    element.scrollTop = element.scrollHeight;
                });
                expect(
                    await sidebar.evaluate((element) => element.scrollTop),
                ).toBeGreaterThan(0);
                await page.screenshot({
                    path: visualEvidencePath(
                        "F-SEARCH-SORT-FILTER",
                        "fm055-sidebar-taller-than-viewport-desktop",
                    ),
                });
                await expectNoPageOverflow(page);

                // --- sidebar that fits the viewport ------------------------
                // The refine sidebar's fixed sections alone (title, size, age,
                // grabs) nearly fill an 800px-tall viewport, so this state is
                // produced deliberately: no configured quick filters, a single
                // indexer/category, no download-type chips, and both toggle
                // lists collapsed.
                const config = await hydra.getConfig();
                const searching = config.searching as Record<string, unknown>;
                searching.showQuickFilterButtons = false;
                searching.alwaysShowQuickFilterButtons = false;
                searching.preselectQuickFilterButtons = [];
                await hydra.saveConfig(config);
                await search("desktop", {spread: 1, withDownloadType: false});
                await openRefineSidebar(page);
                await page.getByTestId("refine-category-toggle").click();
                await page.getByTestId("refine-indexer-toggle").click();
                await expect(
                    page.getByTestId("refine-category-list"),
                ).toBeHidden();
                await expect(
                    page.getByTestId("refine-indexer-list"),
                ).toBeHidden();
                await expect
                    .poll(() =>
                        sidebar.evaluate(
                            (element) =>
                                element.scrollHeight - element.clientHeight,
                        ),
                    )
                    .toBeLessThanOrEqual(1);

                // It stays entirely on screen while the results scroll past.
                const scrollHeight = await page.evaluate(
                    () => document.body.scrollHeight,
                );
                await page.evaluate(
                    (y) => window.scrollTo(0, y),
                    Math.floor(scrollHeight * 0.5),
                );
                const pinnedBox = await sidebar.boundingBox();
                expect(pinnedBox).not.toBeNull();
                if (!pinnedBox) {
                    throw new Error("Sidebar requires deterministic geometry");
                }
                expect(pinnedBox.y).toBeGreaterThanOrEqual(0);
                expect(pinnedBox.y + pinnedBox.height).toBeLessThanOrEqual(
                    visualViewports.desktop.height + 1,
                );
                await expect(
                    sidebar.getByTestId("refine-filter-title"),
                ).toBeVisible();
                await expect(
                    page.getByTestId("refine-clear-all"),
                ).toBeVisible();
                await page.screenshot({
                    path: visualEvidencePath(
                        "F-SEARCH-SORT-FILTER",
                        "fm055-sidebar-fits-scrolled-desktop",
                    ),
                });
                await expectNoPageOverflow(page);
                fixture.spread = 12;
                fixture.withDownloadType = true;
            } else {
                // --- mobile drawer, unregressed ----------------------------
                await expect(sidebar).toHaveCount(0);
                await page.getByTestId("refine-sidebar-toggle").click();
                await expect(
                    page.getByTestId("refine-sidebar-drawer"),
                ).toBeVisible();
                await expect(
                    sidebar.getByTestId("refine-filter-title"),
                ).toBeVisible();
                expect(
                    await sidebar.evaluate(
                        (element) => getComputedStyle(element).position,
                    ),
                ).not.toBe("sticky");
                await page.screenshot({
                    path: visualEvidencePath(
                        "F-SEARCH-SORT-FILTER",
                        "fm055-mobile-refine-drawer",
                    ),
                });
                await page.getByTestId("refine-sidebar-close").click();
                await expectNoPageOverflow(page);
            }

            // --- consolidated toolbar, without rejected results ------------
            await search(viewport, {rejected: false});
            await expect(summary).toContainText("28 of 28 loaded");
            await expect(summary).not.toContainText("rejected");
            await expect(
                page.getByTestId("results-rejected-trigger"),
            ).toHaveCount(0);
            await expectVisualGeometry(page, {
                region: `fm055-toolbar-no-rejected-${viewport}`,
                locator: toolbar,
            });
            await captureVisualRegion(
                toolbar,
                "F-SEARCH-RESULTS",
                `fm055-toolbar-no-rejected-${viewport}`,
            );
        }
    });

    // --- FM-082: per-result detail links, Details cell, and NFO viewer -----

    test("should render every row's detail surfaces against real indexer results", async ({
        page,
    }) => {
        await page.goto("/");
        await searchForUiTestResults(page);

        // `hasNfo` comes straight from the mock indexer's `nfo` attribute:
        // result1 sends `0` (NO), result2 sends `1` (YES), and every other
        // result sends none at all, which the backend defaults to MAYBE.
        await expectNfoState(page, "indexer1-result1", {
            enabled: false,
            tooltip: "No NFO available",
        });
        await expectNfoState(page, "indexer1-result2", {
            enabled: true,
            tooltip: "Show NFO",
        });
        await expectNfoState(page, "indexer1-result3", {
            enabled: true,
            tooltip: "Try to load NFO (may not be available)",
        });

        // The full Details cell: these results carry grabs but no seeders.
        for (const [title, details] of [
            ["indexer1-result1", "1"],
            ["indexer1-result2", "2"],
            ["indexer1-result3", "3"],
            ["indexer2-result1", "4"],
            ["indexer2-result2", "5"],
        ] as const) {
            await expect(
                resultRow(page, title).getByTestId("search-result-details"),
            ).toHaveText(details);
        }

        // This instance configures no dereferer, so an href is the target
        // itself. The mock's details link is its comments link without the
        // `#comments` fragment (`Newznab.java:541`).
        const withComments = resultRow(page, "indexer1-result3");
        await expect(
            withComments.getByTestId("result-comments-link"),
        ).toHaveAttribute("href", "http://localhost/commentsLink#comments");
        await expect(
            withComments.getByTestId("result-comments-link"),
        ).toHaveAttribute("target", "_blank");
        await expect(
            withComments.getByTestId("result-comments-link"),
        ).toHaveAttribute("rel", "noopener");
        await expect(
            withComments.getByTestId("result-details-link"),
        ).toHaveAttribute("href", "http://localhost/commentsLink");

        // Only result3 carries a comment count, so every other row's comments
        // link is disabled rather than pointing at a page with nothing on it.
        const withoutComments = resultRow(page, "indexer1-result1");
        await expect(
            withoutComments.getByTestId("result-comments-link"),
        ).toBeDisabled();
        await expect(
            withoutComments.getByTestId("result-details-link"),
        ).toHaveAttribute("href", "http://some.comments/details");

        // None of these results carries a `source` attribute, so no row
        // offers Binsearch; the mocked-source case is covered below.
        await expect(page.getByTestId("result-binsearch-link")).toHaveCount(0);
    });

    test("should build the Binsearch link from a result source", async ({
        page,
    }) => {
        // The mock indexers send no `source` attribute at all, so this one
        // field is supplied at the response level.
        await mockSourcedResult(page);
        await page.goto("/");
        await page.getByTestId("search-query").fill("binsearch source");
        await page.getByTestId("search-submit").click();
        await expect(page.getByTestId("search-status-modal")).toBeHidden();

        await expect(page.getByTestId("result-binsearch-link")).toHaveAttribute(
            "href",
            "http://binsearch.info/?q=alt.binaries.test&max=100&adv_age=3000&server=",
        );
        await expect(page.getByTestId("result-binsearch-link")).toHaveAttribute(
            "target",
            "_blank",
        );
        await expect(page.getByTestId("result-binsearch-link")).toHaveAttribute(
            "rel",
            "noopener",
        );
        await expect(page.getByTestId("search-result-details")).toHaveText(
            "12k / 4 / 9",
        );
    });

    test("should show a real NFO in the viewer, as inert text", async ({
        page,
    }) => {
        await page.goto("/");
        await searchForUiTestResults(page);

        await resultRow(page, "indexer1-result2")
            .getByTestId("result-nfo")
            .click();

        const dialog = page.getByTestId("nfo-dialog");
        await expect(dialog).toBeVisible();
        const content = page.getByTestId("nfo-dialog-content");
        // The mock indexer answers `t=getnfo` with this description.
        await expect(content).toContainText("NFO for NZB with ID");
        // Rendered as one text node: nothing on this path interprets the
        // indexer's answer as markup.
        expect(
            await content.evaluate((element) => element.childElementCount),
        ).toBe(0);

        await dialog.getByRole("button", {name: "Close"}).click();
        await expect(dialog).toBeHidden();
    });

    test("should report the two non-NFO responses without opening the viewer", async ({
        page,
    }) => {
        await page.goto("/");
        await searchForUiTestResults(page);
        const action = resultRow(page, "indexer1-result3").getByTestId(
            "result-nfo",
        );

        await page.route("**/internalapi/nfo/*", (route) =>
            route.fulfill({
                json: {successful: true, hasNfo: false, content: null},
            }),
        );
        await action.click();
        const infoToast = page.getByRole("alert").filter({
            hasText: "No NFO available",
        });
        await expect(infoToast).toBeVisible();
        await expect(page.getByTestId("nfo-dialog")).toHaveCount(0);
        await infoToast.getByRole("button", {name: "Close"}).click();
        await expect(infoToast).toBeHidden();

        await page.route("**/internalapi/nfo/*", (route) =>
            route.fulfill({
                json: {
                    successful: false,
                    hasNfo: false,
                    content: "Indexer refused the NFO request",
                },
            }),
        );
        await action.click();
        await expect(
            page.getByRole("alert").filter({
                hasText: "Indexer refused the NFO request",
            }),
        ).toBeVisible();
        await expect(page.getByTestId("nfo-dialog")).toHaveCount(0);
    });

    test("should hide the external links from a session without the details permission", async ({
        page,
    }) => {
        // `maySeeDetailsDl` is a server-rendered bootstrap flag, and this
        // shared instance runs without authentication (so the server always
        // sends `true`). Rewriting the flag in the served shell exercises the
        // restricted session without reconfiguring authentication on an
        // instance every other spec shares.
        // The React shell is selected first, then reloaded with the rewrite
        // installed, because only the final document carries the bootstrap.
        // That second load is `page.reload()` rather than a second `goto`
        // because only a reload is guaranteed to re-request the document with
        // the rewrite already installed. FM-094 also proved the negative: any
        // redirect hop in front of it leaves the rewrite unapplied, since
        // Playwright routes only a navigation's initial request ("the shell
        // was never requested"). FM-095 removed the selector hop entirely.
        await page.goto("/");
        const rewrite = await withRestrictedDetailsBootstrap(page);
        await page.reload();
        expect(
            rewrite.applied(),
            `the served shell must carry a maySeeDetailsDl flag to rewrite; served: ${rewrite.servedBootstrap()}`,
        ).toBe(true);
        await dismissWelcomeDialog(page);
        await searchForUiTestResults(page);

        await expect(page.getByTestId("result-nfo").first()).toBeVisible();
        await expect(page.getByTestId("result-binsearch-link")).toHaveCount(0);
        await expect(page.getByTestId("result-comments-link")).toHaveCount(0);
        await expect(page.getByTestId("result-details-link")).toHaveCount(0);
    });

    test("captures the result detail links and the NFO viewer", async ({
        page,
    }) => {
        for (const viewport of ["desktop", "mobile"] as const) {
            await prepareVisualEvidence(page, viewport, async () => {
                await page.goto("/");
                await dismissWelcomeDialog(page);
                await searchForUiTestResults(page);
            });

            const links = resultRow(page, "indexer1-result3").getByTestId(
                "result-links",
            );
            await expectVisualGeometry(page, {
                region: `fm082-result-links-${viewport}`,
                locator: links,
            });
            await captureVisualRegion(
                links,
                "F-SEARCH-RESULTS",
                `fm082-result-links-${viewport}`,
            );

            await resultRow(page, "indexer1-result2")
                .getByTestId("result-nfo")
                .click();
            await expect(page.getByTestId("nfo-dialog")).toBeVisible();
            await captureVisualRegion(
                page.getByTestId("nfo-dialog"),
                "F-SEARCH-RESULTS",
                `fm082-nfo-dialog-${viewport}`,
            );
            await page
                .getByTestId("nfo-dialog")
                .getByRole("button", {name: "Close"})
                .click();
            await expectNoPageOverflow(page);

            // The same cell for a session that may not see details and
            // downloads: the NFO action alone.
            const rewrite = await withRestrictedDetailsBootstrap(page);
            await prepareVisualEvidence(page, viewport, async () => {
                // FM-094: a reload rather than a bare `page.goto("/")`, for
                // the reason given in the sibling test above.
                await page.reload();
                expect(
                    rewrite.applied(),
                    `the served shell must carry a maySeeDetailsDl flag to rewrite; served: ${rewrite.servedBootstrap()}`,
                ).toBe(true);
                await dismissWelcomeDialog(page);
                await searchForUiTestResults(page);
            });
            await expect(page.getByTestId("result-details-link")).toHaveCount(
                0,
            );
            const restricted = resultRow(page, "indexer1-result3").getByTestId(
                "result-links",
            );
            await expectVisualGeometry(page, {
                region: `fm082-result-links-restricted-${viewport}`,
                locator: restricted,
            });
            await captureVisualRegion(
                restricted,
                "F-SEARCH-RESULTS",
                `fm082-result-links-restricted-${viewport}`,
            );
            await page.unrouteAll({behavior: "ignoreErrors"});
        }
    });

    // FM-091: legacy's one-time "Sorting of TV episodes" help dialog
    // (`search-results-controller.js:175-191`), keyed by the server-backed,
    // per-user `isGroupEpisodesHelpShown` flag this shared instance already
    // carries across specs -- explicitly reset to "not shown" first, and its
    // end state asserted afterward, so this test neither depends on nor
    // silently changes whatever another spec left behind.
    test("should show the group-episodes help dialog once for an eligible TV search and record it as shown", async ({
        page,
    }) => {
        await page.request.put(
            "/internalapi/genericstorage/isGroupEpisodesHelpShown?forUser=true",
            {data: false},
        );

        await page.route("**/internalapi/search", (route) =>
            route.fulfill({
                json: {
                    searchResults: [
                        {
                            searchResultId: "tv-one",
                            title: "Group Episodes Help Show S01E01",
                            indexer: "Alpha",
                            category: "TV",
                            showtitle: "Group Episodes Help Show",
                            season: "1",
                            episode: "1",
                            downloadType: "NZB",
                        },
                    ],
                    indexerSearchMetaDatas: [
                        {indexerName: "Alpha", wasSuccessful: true},
                    ],
                    indexerLimitWarnings: [],
                    rejectedReasonsMap: {},
                    notPickedIndexersWithReason: {},
                    numberOfAvailableResults: 1,
                    numberOfRejectedResults: 0,
                },
            }),
        );

        await prepareVisualEvidence(page, "desktop", async () => {
            await page.goto("/");
            await page.getByTestId("search-query").fill("group episodes help");
            await page.getByTestId("search-submit").click();
            await expect(page.getByTestId("search-status-modal")).toBeHidden();
            await expect(
                page.getByTestId("group-episodes-help-dialog"),
            ).toBeVisible();
        });

        const dialog = page.getByTestId("group-episodes-help-dialog");
        await expect(dialog.getByText("Sorting of TV episodes")).toBeVisible();
        await expect(
            dialog.getByText(/automatically grouped by episodes/),
        ).toBeVisible();
        await captureVisualRegion(
            page.locator("body"),
            "F-SEARCH-SORT-FILTER",
            "group-episodes-help-dialog-desktop",
        );

        // Not written yet: the dialog is still open.
        const stillUnshown = await page.request.get(
            "/internalapi/genericstorage/isGroupEpisodesHelpShown?forUser=true",
        );
        expect((await stillUnshown.text()).trim()).not.toBe("true");

        await dialog.getByRole("button", {name: "OK"}).click();
        await expect(dialog).toBeHidden();

        await expect
            .poll(async () => {
                const shown = await page.request.get(
                    "/internalapi/genericstorage/isGroupEpisodesHelpShown?forUser=true",
                );
                return (await shown.text()).trim();
            })
            .toBe("true");

        // A follow-up TV search in the same load shows no second dialog.
        await page.getByTestId("search-query").fill("group episodes help two");
        await page.getByTestId("search-submit").click();
        await expect(page.getByTestId("search-status-modal")).toBeHidden();
        await expect(
            page.getByTestId("group-episodes-help-dialog"),
        ).toHaveCount(0);

        await page.unrouteAll({behavior: "ignoreErrors"});
    });

    // FM-096: a real search against a mock indexer configured with a colour,
    // proving the value the config dialog round-trips (`config-indexers.spec.ts`)
    // now actually renders somewhere -- and only on the rows of the indexer it
    // was set for.
    test("should show a swatch only on the rows of the indexer with a configured colour", async ({
        hydra,
        page,
    }) => {
        const config = await hydra.getConfig();
        const indexers = config.indexers as Record<string, unknown>[];
        const mock1 = indexers.find((indexer) => indexer.name === "Mock1");
        if (mock1 === undefined) {
            throw new Error("Expected a configured 'Mock1' indexer");
        }
        mock1.color = "rgb(116,18,18)";
        await hydra.saveConfig(config);
        // This navigation is not about picking a shell -- since FM-095 there
        // is only one. It is still required: it re-seeds
        // the page's `SafeConfigContext` query (ADR-0017) with the colour just
        // saved, because a save through this direct API call, unlike one
        // through the config UI, never invalidates that already-mounted query
        // on its own.
        await page.goto("/");
        await dismissWelcomeDialog(page);
        await searchForUiTestResults(page);

        const colouredRow = resultRow(page, "indexer1-result1");
        const swatch = colouredRow.getByTestId("search-result-indexer-swatch");
        await expect(swatch).toBeVisible();
        await expect(swatch).toHaveAttribute("aria-hidden");
        expect(
            await swatch.evaluate(
                (element) => getComputedStyle(element).backgroundColor,
            ),
        ).toBe("rgb(116, 18, 18)");

        const uncolouredRow = resultRow(page, "indexer2-result1");
        await expect(
            uncolouredRow.getByTestId("search-result-indexer-swatch"),
        ).toHaveCount(0);

        // The name text is never dropped -- colour decorates, it does not
        // replace the row's actual carrier of the information.
        await expect(colouredRow).toContainText("Mock1");
        await expect(uncolouredRow).toContainText("Mock2");
    });

    // FM-096 visual gate: a dark colour, a saturated colour, and no colour
    // side by side, plus a recency-flagged row to prove the swatch and the
    // FM-054 teal stripe coexist without either changing the other.
    test("should provide deterministic indexer-colour visual evidence across desktop and mobile", async ({
        hydra,
        page,
    }) => {
        const config = await hydra.getConfig();
        const indexers = config.indexers as Record<string, unknown>[];
        indexers.push(
            {
                name: "Dark Indexer",
                host: testEnvironment.mockserverInternalUrl,
                apiPath: "/api",
                apiKey: "dark",
                backend: "NEWZNAB",
                allCapsChecked: true,
                supportedSearchTypes: ["SEARCH"],
                supportedSearchIds: [],
                color: "rgb(20,20,20)",
            },
            {
                name: "Saturated Indexer",
                host: testEnvironment.mockserverInternalUrl,
                apiPath: "/api",
                apiKey: "saturated",
                backend: "NEWZNAB",
                allCapsChecked: true,
                supportedSearchTypes: ["SEARCH"],
                supportedSearchIds: [],
                color: "rgb(255,45,120)",
            },
            // Deliberately no config entry for "Uncoloured Indexer" -- an
            // indexer absent from the map renders no swatch, the same as one
            // present with a null colour.
        );
        await hydra.saveConfig(config);

        const now = Math.floor(Date.now() / 1_000);
        await page.route("**/internalapi/search", (route) =>
            route.fulfill({
                json: {
                    searchResults: [
                        {
                            searchResultId: "dark",
                            title: "Indexer Colour Dark Result",
                            indexer: "Dark Indexer",
                            category: "Movies",
                            size: 4 * 1024 * 1024,
                            seeders: 12,
                            epoch: now - 86_400,
                            age: "1 day",
                            downloadType: "NZB",
                        },
                        {
                            searchResultId: "saturated",
                            title: "Indexer Colour Saturated Result",
                            indexer: "Saturated Indexer",
                            category: "Movies",
                            size: 5 * 1024 * 1024,
                            seeders: 7,
                            epoch: now - 40 * 86_400,
                            age: "40 days",
                            downloadType: "NZB",
                        },
                        {
                            searchResultId: "uncoloured",
                            title: "Indexer Colour Uncoloured Result",
                            indexer: "Uncoloured Indexer",
                            category: "Movies",
                            size: 3 * 1024 * 1024,
                            seeders: 3,
                            epoch: now - 40 * 86_400,
                            age: "40 days",
                            downloadType: "NZB",
                        },
                    ],
                    indexerSearchMetaDatas: [
                        {indexerName: "Dark Indexer", wasSuccessful: true},
                        {
                            indexerName: "Saturated Indexer",
                            wasSuccessful: true,
                        },
                        {
                            indexerName: "Uncoloured Indexer",
                            wasSuccessful: true,
                        },
                    ],
                    indexerLimitWarnings: [],
                    rejectedReasonsMap: {},
                    notPickedIndexersWithReason: {},
                    numberOfAvailableResults: 3,
                    numberOfRejectedResults: 0,
                },
            }),
        );

        await prepareVisualEvidence(page, "desktop", async () => {
            await page.goto("/");
            await dismissWelcomeDialog(page);
            await page.getByTestId("search-query").fill("indexer colour");
            await page.getByTestId("search-submit").click();
            await expect(page.getByTestId("search-status-modal")).toBeHidden();
            await expect(
                page.getByTestId("search-results-table"),
            ).toBeVisible();
        });

        await toggleDisplayOption(page, "Highlight recent");

        const darkRow = resultRow(page, "Indexer Colour Dark Result");
        const saturatedRow = resultRow(page, "Indexer Colour Saturated Result");
        const uncolouredRow = resultRow(
            page,
            "Indexer Colour Uncoloured Result",
        );

        await expect(
            darkRow.getByTestId("search-result-indexer-swatch"),
        ).toHaveCSS("background-color", "rgb(20, 20, 20)");
        await expect(
            saturatedRow.getByTestId("search-result-indexer-swatch"),
        ).toHaveCSS("background-color", "rgb(255, 45, 120)");
        await expect(
            uncolouredRow.getByTestId("search-result-indexer-swatch"),
        ).toHaveCount(0);
        // The recency stripe (FM-054) and the FM-096 swatch coexist on the
        // same row without either changing.
        expect((await recencyTreatment(darkRow)).stripe).toContain("inset");

        await captureVisualRegion(
            page.getByTestId("search-results-table"),
            "F-SEARCH-RESULTS",
            "indexer-colour-desktop",
        );

        await prepareVisualEvidence(page, "mobile", async () => {
            await page.goto("/");
            await dismissWelcomeDialog(page);
            await page.getByTestId("search-query").fill("indexer colour");
            await page.getByTestId("search-submit").click();
            await expect(page.getByTestId("search-status-modal")).toBeHidden();
            await expect(
                page.getByTestId("search-results-table"),
            ).toBeVisible();
        });
        await expect(
            darkRow.getByTestId("search-result-indexer-swatch"),
        ).toHaveCSS("background-color", "rgb(20, 20, 20)");
        await captureVisualRegion(
            page.getByTestId("search-results-table"),
            "F-SEARCH-RESULTS",
            "indexer-colour-mobile",
        );

        await page.unrouteAll({behavior: "ignoreErrors"});
    });
});

async function expectNfoState(
    page: import("@playwright/test").Page,
    title: string,
    expected: {enabled: boolean; tooltip: string},
): Promise<void> {
    const action = resultRow(page, title).getByTestId("result-nfo");
    await expect(action).toBeVisible();
    if (expected.enabled) {
        await expect(action).toBeEnabled();
    } else {
        await expect(action).toBeDisabled();
    }
    // The tooltip text is also the control's accessible name, so it is
    // assertable without hovering.
    await expect(action).toHaveAccessibleName(`${expected.tooltip}: ${title}`);
}

/**
 * One search response carrying the fields the mock indexers never send:
 * a `source` (the Binsearch query's input) plus a full set of Details counts.
 */
async function mockSourcedResult(
    page: import("@playwright/test").Page,
): Promise<void> {
    await page.route("**/internalapi/search", (route) =>
        route.fulfill({
            json: {
                searchResults: [
                    {
                        searchResultId: "sourced",
                        title: "Sourced Result",
                        indexer: "One",
                        category: "TV",
                        downloadType: "NZB",
                        source: "alt.binaries.test",
                        grabs: 12000,
                        seeders: 4,
                        peers: 9,
                        hasNfo: "MAYBE",
                    },
                ],
                indexerSearchMetaDatas: [
                    {indexerName: "One", wasSuccessful: true},
                ],
                indexerLimitWarnings: [],
                rejectedReasonsMap: {},
                notPickedIndexersWithReason: {},
                numberOfAvailableResults: 1,
                numberOfRejectedResults: 0,
            },
        }),
    );
}

/**
 * Serves the React shell with `maySeeDetailsDl` flipped to false. The flag is
 * server-rendered into the shell (`templates/react.html`), and this shared
 * instance runs without authentication, so the server itself always reports
 * true; rewriting the served document is the one way to exercise the
 * restricted session without reconfiguring authentication for every other
 * spec that shares the instance.
 */
async function withRestrictedDetailsBootstrap(
    page: import("@playwright/test").Page,
): Promise<{applied: () => boolean; servedBootstrap: () => string}> {
    let applied = false;
    let servedBootstrap = "(the shell was never requested)";
    await page.route(
        (url) => url.pathname === "/",
        async (route) => {
            const response = await route.fetch();
            const body = await response.text();
            servedBootstrap =
                /__NZBHYDRA_BOOTSTRAP__.*/.exec(body)?.[0]?.slice(0, 400) ??
                body.slice(0, 400);
            const restricted = body.replace(
                /"maySeeDetailsDl"\s*:\s*true/,
                '"maySeeDetailsDl":false',
            );
            applied = applied || restricted !== body;
            await route.fulfill({response, body: restricted});
        },
    );
    return {applied: () => applied, servedBootstrap: () => servedBootstrap};
}

// The results table header row's height at 1280x800, measured against the
// clean `89286c376` baseline (FM-044's commit) while FM-034's inline
// per-column-header filter controls were still rendered. FM-045 removes them
// and drops the header cells' 16px vertical padding to the body cells' 6px,
// so the simplified header must measure below this.
const BASELINE_HEADER_ROW_HEIGHT_DESKTOP = 63.25;

async function openRefineSidebar(
    page: import("@playwright/test").Page,
): Promise<void> {
    const toggle = page.getByTestId("refine-sidebar-toggle");
    if ((await toggle.getAttribute("aria-expanded")) !== "true") {
        await toggle.click();
    }
    await expect(page.getByTestId("refine-filter-title")).toBeVisible();
}

// One Category/Indexer toggle row, addressed by the value it filters on.
function refineOption(
    page: import("@playwright/test").Page,
    testId: string,
    value: string,
): import("@playwright/test").Locator {
    return page.locator(
        `[data-testid="${testId}"][data-filter-value="${value}"]`,
    );
}

// FM-041's display-options popover. `data-testid` queries rather than role
// queries wherever the drawer or the popover is open, because MUI marks the
// rest of the document `aria-hidden` while a modal surface is open.
async function openDisplayOptions(
    page: import("@playwright/test").Page,
): Promise<void> {
    const toggle = page.getByTestId("display-options-toggle");
    if ((await toggle.getAttribute("aria-expanded")) !== "true") {
        await toggle.click();
    }
    await expect(page.getByTestId("display-options")).toBeVisible();
}

async function closeDisplayOptions(
    page: import("@playwright/test").Page,
): Promise<void> {
    const toggle = page.getByTestId("display-options-toggle");
    if ((await toggle.getAttribute("aria-expanded")) === "true") {
        await page.keyboard.press("Escape");
        await expect(page.getByTestId("display-options")).toHaveCount(0);
    }
}

function displayOptionsPaper(
    page: import("@playwright/test").Page,
): import("@playwright/test").Locator {
    return page
        .getByTestId("display-options")
        .locator('xpath=ancestor::*[contains(@class,"MuiPaper-root")][1]');
}

// The mock's display-options popover surface: `#2a3133` and at least its
// 220px minimum width, fully inside the viewport with no page horizontal
// overflow. FM-054 (ADR-0014): the popover no longer pins the mock's own
// 11px radius literal -- that value moved out of feature code entirely, and
// the popover now renders at the theme's shared raised-`Paper` radius
// (`app/theme.ts`'s `MuiPaper` override, 12px) rather than restating a
// bespoke one; ADR-0014 permits this kind of pixel deviation from the mock
// without justification.
async function expectDisplayMenuSurface(
    page: import("@playwright/test").Page,
): Promise<void> {
    const paper = displayOptionsPaper(page);
    const surface = await paper.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
            backgroundColor: style.backgroundColor,
            borderTopLeftRadius: style.borderTopLeftRadius,
        };
    });
    expect(surface.backgroundColor).toBe("rgb(42, 49, 51)");
    expect(surface.borderTopLeftRadius).toBe("12px");
    const box = await paper.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    if (!box || !viewport) {
        throw new Error("Display popover requires deterministic geometry");
    }
    expect(box.width).toBeGreaterThanOrEqual(220);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    await expectNoPageOverflow(page);
}

// One display-options entry's checked state, read with the popover reopened for
// the duration of the check and closed again afterwards, so no modal surface is
// left over the results.
async function displayOptionChecked(
    page: import("@playwright/test").Page,
    name: string,
): Promise<boolean> {
    await openDisplayOptions(page);
    const checked = await page
        .getByRole("checkbox", {name, exact: true})
        .isChecked();
    await closeDisplayOptions(page);
    return checked;
}

async function toggleDisplayOption(
    page: import("@playwright/test").Page,
    name: string,
): Promise<void> {
    await openDisplayOptions(page);
    await page.getByRole("checkbox", {name, exact: true}).click();
    await closeDisplayOptions(page);
}

// The "Show refine sidebar" entry closes the popover itself, so this one does
// not close it afterwards.
async function toggleRefineSurfaceFromMenu(
    page: import("@playwright/test").Page,
): Promise<void> {
    await openDisplayOptions(page);
    await page
        .getByRole("checkbox", {name: "Show refine sidebar", exact: true})
        .click();
    await expect(page.getByTestId("display-options")).toHaveCount(0);
}

// The compact-row density capture. Deliberately a viewport-clipped page
// screenshot rather than an element screenshot: at 1280x800 the results table's
// own minimum width (1320px plus the sidebar delta) exceeds the viewport, and it
// scrolls inside its own `overflowX: auto` wrapper, so `locator.screenshot()`
// yields an image whose right-hand columns are blank -- the same clipping defect
// FM-045's mobile-drawer capture is recorded as carrying. Clipping to the
// intersection of the table's box and the viewport captures exactly what the
// user actually sees at this viewport.
async function captureCompactRows(
    page: import("@playwright/test").Page,
): Promise<void> {
    const table = page.getByTestId("search-results-table");
    // With four rows the table's lower edge otherwise sits below the fold, so
    // the vertical clip would cut it as well.
    await table.scrollIntoViewIfNeeded();
    const box = await table.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    if (!box || !viewport) {
        throw new Error("Table requires deterministic geometry");
    }
    await page.screenshot({
        clip: {
            height: Math.min(box.height, viewport.height - box.y),
            width: Math.min(box.width, viewport.width - box.x),
            x: box.x,
            y: box.y,
        },
        path: visualEvidencePath("F-SEARCH-RESULTS", "compact-rows-desktop"),
    });
}

async function refineSurfaceMetrics(
    page: import("@playwright/test").Page,
): Promise<{gap: number; sidebarWidth: number; tableWidth: number}> {
    const [sidebarBox, tableBox] = await Promise.all([
        page.getByTestId("refine-sidebar").boundingBox(),
        page.getByTestId("search-results-table").boundingBox(),
    ]);
    expect(sidebarBox).not.toBeNull();
    expect(tableBox).not.toBeNull();
    if (!sidebarBox || !tableBox) {
        throw new Error("Sidebar and table require deterministic geometry");
    }
    return {
        gap: tableBox.x - (sidebarBox.x + sidebarBox.width),
        sidebarWidth: sidebarBox.width,
        tableWidth: tableBox.width,
    };
}

async function bodyCellPaddingY(
    page: import("@playwright/test").Page,
): Promise<{paddingBottom: string; paddingTop: string}> {
    return await page
        .getByTestId("search-result-row")
        .first()
        .getByTestId("search-result-title")
        .evaluate((element) => {
            const style = getComputedStyle(element);
            return {
                paddingBottom: style.paddingBottom,
                paddingTop: style.paddingTop,
            };
        });
}

async function tableHeight(
    page: import("@playwright/test").Page,
): Promise<number> {
    return await page
        .getByTestId("search-results-table")
        .evaluate((element) => element.getBoundingClientRect().height);
}

async function expectNoTitleCellOverflow(
    page: import("@playwright/test").Page,
): Promise<void> {
    const titles = page.getByTestId("search-result-title");
    const count = await titles.count();
    expect(count).toBeGreaterThan(0);
    for (let index = 0; index < count; index++) {
        expect(
            await titles
                .nth(index)
                .evaluate(
                    (element) => element.scrollWidth <= element.clientWidth + 1,
                ),
        ).toBe(true);
    }
}

function resultRow(
    page: import("@playwright/test").Page,
    title: string,
): import("@playwright/test").Locator {
    return page.locator(
        `[data-testid="search-result-row"][data-result-title="${title}"]`,
    );
}

// The recency flag's two independent properties, plus the flagged row's own
// overflow state.
async function recencyTreatment(
    row: import("@playwright/test").Locator,
): Promise<{ageColor: string; noRowOverflow: boolean; stripe: string}> {
    return await row.evaluate((element) => {
        const ageCell = element.querySelector('td[data-label="Age"]');
        const firstCell = element.querySelector('td[data-label="Select"]');
        if (!ageCell || !firstCell) {
            throw new Error("Result row requires an age cell and a first cell");
        }
        return {
            ageColor: getComputedStyle(ageCell).color,
            noRowOverflow: element.scrollWidth <= element.clientWidth + 1,
            stripe: getComputedStyle(firstCell).boxShadow,
        };
    });
}

async function expectNoPageOverflow(
    page: import("@playwright/test").Page,
): Promise<void> {
    expect(
        await page
            .locator("html")
            .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);
}

// FM-042: every `search-result-row`'s viewport-relative top/bottom edge in
// one batched `evaluate` (cheaper and simpler than a `boundingBox()` round
// trip per row for a 24-row fixture), used to check that no row renders
// above the sticky header's bottom edge and that several rows have scrolled
// out from under the sticky regions while others remain visible beneath
// them.
async function visibleRowRects(
    page: import("@playwright/test").Page,
): Promise<Array<{bottom: number; top: number}>> {
    return await page.evaluate(() =>
        Array.from(
            document.querySelectorAll('[data-testid="search-result-row"]'),
        ).map((row) => {
            const rect = row.getBoundingClientRect();
            return {bottom: rect.bottom, top: rect.top};
        }),
    );
}

// FM-042: a menu/popover opened while the page is scrolled renders fully
// within the viewport, above the sticky toolbar/header regions. Rather than
// asserting a z-index literal, the caller separately proves the stacking
// order by driving a real Playwright click through to a menu item -- an
// actionability check that fails if a higher-stacked sticky region actually
// covers the target.
async function expectMenuFullyInViewport(
    page: import("@playwright/test").Page,
    locator: import("@playwright/test").Locator,
): Promise<void> {
    const box = await locator.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    if (!box || !viewport) {
        throw new Error("Menu requires deterministic geometry");
    }
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
}

// FM-042 (ADR-0011): the re-proportioned `<colgroup>`'s own verification --
// every labelled header cell (the six sortable headers, measured on both the
// `<th>` and its sort `<button>`, plus the plain `Actions` header cell,
// where `target` is the cell itself since it has no separate inner
// shrink-to-content element) fits its full label with `scrollWidth <=
// clientWidth`, and its rendered text equals the expected full label (never
// silently truncated to something shorter). The unlabelled checkbox header
// is exempt, matching this task's Acceptance.
const HEADER_FIT_LABELS: Array<{
    column: string;
    label: string;
}> = [
    {column: "title", label: "Title"},
    {column: "indexer", label: "Indexer"},
    {column: "category", label: "Category"},
    {column: "size", label: "Size"},
    {column: "grabs", label: "Details"},
    {column: "epoch", label: "Age"},
];

async function measureHeaderFit(
    page: import("@playwright/test").Page,
): Promise<{
    cells: Array<{
        label: string;
        expectedLabel: string;
        text: string | null;
        cellScrollWidth: number;
        cellClientWidth: number;
        targetScrollWidth: number;
        targetClientWidth: number;
    }>;
    tableScrollWidth: number;
    tableClientWidth: number;
}> {
    return await page.evaluate((columns) => {
        const table = document.querySelector(
            '[data-testid="search-results-table"]',
        );
        if (!table) {
            throw new Error("search-results-table not found");
        }
        const cells = columns.map(({column, label}) => {
            const button = document.querySelector(
                `[data-testid="sort-${column}"]`,
            );
            const cell = button?.closest("th");
            if (!button || !cell) {
                throw new Error(`Header cell not found for column ${column}`);
            }
            return {
                label,
                // The default sort column (`epoch`/Age) renders its sort
                // arrow suffix (" ▲"/" ▼") even before any click, so the
                // full-label check below is "starts with the label", not
                // exact equality -- the arrow is additive, not a
                // replacement, and is covered by this component's existing
                // sort-indicator tests elsewhere.
                expectedLabel: label,
                text: button.textContent,
                cellScrollWidth: cell.scrollWidth,
                cellClientWidth: cell.clientWidth,
                targetScrollWidth: button.scrollWidth,
                targetClientWidth: button.clientWidth,
            };
        });
        const actionsCell = document.querySelector(
            'thead th[data-label="Actions"]',
        );
        if (!actionsCell) {
            throw new Error("Actions header cell not found");
        }
        cells.push({
            label: "Actions",
            expectedLabel: "Actions",
            text: actionsCell.textContent,
            cellScrollWidth: actionsCell.scrollWidth,
            cellClientWidth: actionsCell.clientWidth,
            targetScrollWidth: actionsCell.scrollWidth,
            targetClientWidth: actionsCell.clientWidth,
        });
        return {
            cells,
            tableScrollWidth: table.scrollWidth,
            tableClientWidth: table.clientWidth,
        };
    }, HEADER_FIT_LABELS);
}

async function expectSameClosedTableBox(
    page: import("@playwright/test").Page,
    expected: {width: number; x: number},
): Promise<void> {
    const box = await page.getByTestId("search-results-table").boundingBox();
    expect(box).not.toBeNull();
    if (!box) {
        throw new Error("Table requires deterministic geometry");
    }
    expect(box.width).toBe(expected.width);
    expect(box.x).toBe(expected.x);
    await expectNoPageOverflow(page);
}

async function headerRowHeight(
    page: import("@playwright/test").Page,
): Promise<number> {
    return await page
        .getByTestId("search-results-table")
        .locator("thead tr")
        .first()
        .evaluate((element) => element.getBoundingClientRect().height);
}

// FM-034's inline per-column-header filter popovers and the mobile-only
// toolbar filter rows they shared controls with are removed outright.
async function expectNoInlineFilterControls(
    page: import("@playwright/test").Page,
): Promise<void> {
    for (const selector of [
        '[data-testid^="header-filter-"]',
        '[data-testid*="-header-"]',
        '[data-testid="freetext-filter-title"]',
        '[data-testid="filter-toggle-indexer"]',
        '[data-testid="filter-toggle-category"]',
    ]) {
        await expect(page.locator(selector)).toHaveCount(0);
    }
}

async function searchForUiTestResults(
    page: import("@playwright/test").Page,
): Promise<void> {
    await searchForResult(
        page,
        testEnvironment.uiTestQuery,
        testEnvironment.uiTestResultTitles[0],
    );
    await expectVisibleResultTitles(page, testEnvironment.uiTestResultTitles);
}

async function expectVisibleResultTitles(
    page: import("@playwright/test").Page,
    expectedTitles: string[],
): Promise<void> {
    const rows = page
        .getByTestId("search-results-table")
        .getByTestId("search-result-row");
    await expect(rows).toHaveCount(expectedTitles.length);
    await expect
        .poll(() =>
            rows.evaluateAll((elements) =>
                elements.map((element) =>
                    element.getAttribute("data-result-title")!,
                ),
            ),
        )
        .toEqual(expectedTitles);
}

// FM-094: `waitForSortingOrFiltering` is gone with its two callers. It waited
// out legacy's `blockUI` overlay, which the React shell does not render at all.

async function mockGroupedResults(
    page: import("@playwright/test").Page,
): Promise<void> {
    await page.route("**/internalapi/search", (route) =>
        route.fulfill({
            json: {
                searchResults: [
                    {
                        searchResultId: "one",
                        title: "Example Show",
                        indexer: "One",
                        category: "TV",
                        hash: 1,
                        downloadType: "NZB",
                        downloadedAt: null,
                    },
                    {
                        searchResultId: "two",
                        title: "Example Show",
                        indexer: "Two",
                        category: "TV",
                        hash: 1,
                        downloadType: "NZB",
                        downloadedAt: null,
                    },
                    {
                        searchResultId: "three",
                        title: "Another Show",
                        indexer: "Three",
                        category: "TV",
                        hash: 2,
                        downloadType: "NZB",
                        downloadedAt: null,
                    },
                ],
                indexerSearchMetaDatas: [
                    {indexerName: "One", wasSuccessful: true},
                ],
                indexerLimitWarnings: [],
                rejectedReasonsMap: {},
                notPickedIndexersWithReason: {},
                numberOfAvailableResults: 3,
                numberOfRejectedResults: 0,
            },
        }),
    );
}

async function searchForGroupedResults(
    page: import("@playwright/test").Page,
): Promise<void> {
    await page.getByTestId("search-query").fill("grouped results");
    await page.getByTestId("search-submit").click();
    await expect(page.getByTestId("search-status-modal")).toBeHidden();
}

async function assertGroupExpansionAndBulkSelection(
    page: import("@playwright/test").Page,
): Promise<void> {
    const rows = page.getByTestId("search-result-row");
    await expect(rows).toHaveCount(2);
    await page.getByRole("button", {name: "Expand duplicates"}).click();
    await expect(rows).toHaveCount(3);
    // FM-040 replaced the flat "Select all"/"Deselect all"/"Invert
    // selection" toolbar buttons this helper used to click directly with a
    // tri-state header checkbox plus an adjacent caret opening a
    // role="menu" carrying the same three actions (F-SEARCH-GROUP-
    // SELECTION); this helper is updated in step to keep exercising the
    // same real capability through its new entry point. Playwright's
    // default (desktop-sized) viewport keeps the header's copy
    // (header-selection-menu) visible; the toolbar's mobile-reachable copy
    // is exercised separately by this task's own dedicated visual-evidence
    // test at a mobile viewport.
    const selectionMenu = page.getByTestId("header-selection-menu");
    await selectionMenu
        .getByRole("button", {name: "Selection options"})
        .click();
    await page.getByRole("menuitem", {name: "Select all", exact: true}).click();
    await expect(rows.locator("input[type=checkbox]")).toHaveCount(3);
    await expect
        .poll(() =>
            rows
                .locator("input[type=checkbox]")
                .evaluateAll((inputs) =>
                    inputs.every(
                        (input) => (input as HTMLInputElement).checked,
                    ),
                ),
        )
        .toBe(true);
    await selectionMenu
        .getByRole("button", {name: "Selection options"})
        .click();
    await page.getByRole("menuitem", {name: "Invert selection"}).click();
    await expect
        .poll(() =>
            rows
                .locator("input[type=checkbox]")
                .evaluateAll((inputs) =>
                    inputs.every(
                        (input) => !(input as HTMLInputElement).checked,
                    ),
                ),
        )
        .toBe(true);
}
