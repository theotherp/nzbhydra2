import {
    dismissWelcomeDialog,
    expect,
    searchForResult,
    test,
    testEnvironment,
} from "./fixtures";

test.describe("Search results", () => {
    test.beforeEach(async ({ hydra, page }) => {
        await hydra.configureMockIndexers(["1", "2"]);
        await page.goto("/");
        await dismissWelcomeDialog(page);
        await expect(page.getByTestId("search-query")).toBeVisible();
    });

    test("should sort results by title in both directions", async ({
        page,
    }) => {
        await searchForUiTestResults(page);

        const titleSort = page.getByTestId("sort-title");
        await expect(titleSort).toHaveAttribute("data-sort-direction", "none");
        await titleSort.click();
        await expect(titleSort).toHaveAttribute(
            "data-sort-direction",
            "ascending",
        );
        await expectVisibleResultTitles(
            page,
            testEnvironment.uiTestResultTitles,
        );
        await waitForSortingOrFiltering(page);

        await titleSort.click();
        await expect(titleSort).toHaveAttribute(
            "data-sort-direction",
            "descending",
        );
        await expectVisibleResultTitles(
            page,
            [...testEnvironment.uiTestResultTitles].reverse(),
        );
        await waitForSortingOrFiltering(page);
    });

    test("should filter titles and sizes through result controls", async ({
        page,
    }) => {
        await searchForUiTestResults(page);

        const titleFilter = page.getByTestId("freetext-filter-title");
        await titleFilter.type("indexer1");
        await expectVisibleResultTitles(
            page,
            testEnvironment.uiTestResultTitles.slice(0, 3),
        );
        await waitForSortingOrFiltering(page);

        await titleFilter.fill("");
        await titleFilter.press("Backspace");
        await expectVisibleResultTitles(
            page,
            testEnvironment.uiTestResultTitles,
        );
        await waitForSortingOrFiltering(page);

        const sizeFilter = page.getByTestId("filter-toggle-size");
        await sizeFilter.locator(".toggle-column-filter").click();
        await page.getByTestId("number-filter-min-size").fill("4");
        await page.getByTestId("number-filter-max-size").fill("5");
        await page.getByTestId("number-filter-apply-size").click();

        await expectVisibleResultTitles(
            page,
            testEnvironment.uiTestResultTitles.slice(3),
        );
        await expect(page.getByTestId("search-results-summary")).toHaveText(
            "Loaded 5 (3 filtered, 0 duplicates) of 5 results (rejected 0)",
        );
        await waitForSortingOrFiltering(page);
    });

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
        const resultTitles = page.getByTestId("search-result-title");
        await page.getByRole("button", { name: "x265", exact: true }).click();
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

        await page.getByRole("button", { name: "x265", exact: true }).click();
        await page.getByRole("button", { name: "HEVC", exact: true }).click();
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

        await page
            .getByRole("button", { name: "Invalid regex", exact: true })
            .click();
        await expectVisibleResultTitles(
            page,
            testEnvironment.uiTestResultTitles,
        );
        await page.getByTestId("freetext-filter-title").type("/[/");
        await expect(page.getByTestId("search-result-row")).toHaveCount(0);
    });

    test("should discard titleless results without interrupting rendering", async ({
        page,
    }) => {
        await page.route("**/internalapi/search", async (route) => {
            const response = await route.fetch();
            const body = (await response.json()) as {
                searchResults: Array<{ title: string | null }>;
            };
            body.searchResults[0].title = null;
            await route.fulfill({ response, json: body });
        });

        await searchForResult(
            page,
            testEnvironment.uiTestQuery,
            "indexer1-result2",
        );
        await expect(page.getByTestId("search-result-row")).toHaveCount(4);
    });

    test("should clear every filtered-out selection", async ({ page }) => {
        await searchForUiTestResults(page);

        const firstResult = page
            .getByTestId("search-result-row")
            .filter({ hasText: "indexer1-result1" });
        const secondResult = page
            .getByTestId("search-result-row")
            .filter({ hasText: "indexer1-result2" });
        await firstResult.locator("input[type=checkbox]").check();
        await secondResult.locator("input[type=checkbox]").check();

        const titleFilter = page.getByTestId("freetext-filter-title");
        await titleFilter.type("indexer2");
        await expectVisibleResultTitles(
            page,
            testEnvironment.uiTestResultTitles.slice(3),
        );
        await titleFilter.fill("");
        await titleFilter.press("Backspace");

        await expect(
            firstResult.locator("input[type=checkbox]"),
        ).not.toBeChecked();
        await expect(
            secondResult.locator("input[type=checkbox]"),
        ).not.toBeChecked();
    });

    test("should retain the configured title-group page size after recalculation", async ({
        hydra,
        page,
    }) => {
        const config = await hydra.getConfig();
        const searching = config.searching as Record<string, unknown>;
        searching.loadLimitInternal = 1;
        await hydra.saveConfig(config);
        await page.reload();

        await page.getByTestId("search-query").fill("titleduplicates");
        await page.getByTestId("search-submit").click();
        await expect(page.getByTestId("search-status-modal")).toBeHidden();

        const rows = page
            .getByTestId("search-results-table")
            .getByTestId("search-result-row");
        await expect(rows).toHaveCount(1);
        await page.getByTestId("sort-title").click();
        await expect(rows).toHaveCount(1);
    });

    test("should sort and filter deterministic results in the React shell", async ({
        page,
    }) => {
        await page.goto("ui/react?redirect=/");
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

        await page
            .getByTestId("freetext-filter-title")
            .fill("indexer2 !result3");
        await expectVisibleResultTitles(
            page,
            testEnvironment.uiTestResultTitles.slice(3, 5),
        );
        await page.getByTestId("freetext-filter-title").fill("/[/");
        await expect(page.getByTestId("search-result-row")).toHaveCount(0);
        await page.getByTestId("freetext-filter-title").fill("");

        await page.getByTestId("number-filter-min-size").fill("4");
        await expectVisibleResultTitles(
            page,
            testEnvironment.uiTestResultTitles.slice(3),
        );
        await page.getByTestId("number-filter-clear-size").click();
        await expectVisibleResultTitles(
            page,
            [...testEnvironment.uiTestResultTitles].sort(),
        );
    });

    test("should expand grouped React results and select visible rows", async ({
        page,
    }) => {
        await mockGroupedResults(page);
        await page.goto("ui/react?redirect=/");
        await searchForGroupedResults(page);

        await assertGroupExpansionAndBulkSelection(page);
    });

    test("should expand grouped legacy results and select visible rows", async ({
        page,
    }) => {
        await mockGroupedResults(page);
        await page.addInitScript(() =>
            window.localStorage.setItem("nzbhydra.duplicatesDisplayed", "true"),
        );
        await page.reload();
        await searchForGroupedResults(page);

        await assertLegacyGroupExpansionAndBulkSelection(page);
    });

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
        await page.goto("ui/react?redirect=/");
        await page.getByTestId("search-query").fill("deterministic filters");
        await page.getByTestId("search-submit").click();
        await expect(page.getByTestId("search-status-modal")).toBeHidden();

        for (const name of ["WEB", "1080p", "x265", "Preferred"]) {
            await expect(
                page.getByRole("button", { name, exact: true }),
            ).toHaveAttribute("aria-pressed", "true");
        }
        await expectVisibleResultTitles(page, ["Alpha WEB-DL 1080p x265"]);
        for (const name of ["WEB", "1080p", "x265", "Preferred"]) {
            await page.getByRole("button", { name, exact: true }).click();
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
            await expect(sort).toContainText(
                `(${direction === "asc" ? "ascending" : "descending"})`,
            );
            await expect(sort).toHaveAttribute(
                "data-sort-direction",
                direction,
            );
            await expect(
                page.getByTestId("search-result-title").first(),
            ).toHaveText(firstTitle);
        }

        const indexerFilter = page.getByTestId("filter-toggle-indexer");
        await indexerFilter.getByLabel("Beta").uncheck();
        await expectVisibleResultTitles(page, [
            "Charlie WEB 2160p x265",
            "Bravo BluRay 720p HEVC",
        ]);
        await indexerFilter.getByLabel("Beta").check();

        const categoryFilter = page.getByTestId("filter-toggle-category");
        await categoryFilter.getByLabel("TV").uncheck();
        await expectVisibleResultTitles(page, [
            "Charlie WEB 2160p x265",
            "Bravo BluRay 720p HEVC",
        ]);
        await categoryFilter.getByLabel("TV").check();

        await page.getByTestId("number-filter-min-grabs").fill("8");
        await expectVisibleResultTitles(page, ["Alpha WEB-DL 1080p x265"]);
        await page.getByTestId("number-filter-clear-grabs").click();

        await page.getByTestId("number-filter-max-age").fill("2");
        await expectVisibleResultTitles(page, ["Alpha WEB-DL 1080p x265"]);
        await page.getByTestId("number-filter-clear-age").click();
        await expectVisibleResultTitles(page, [
            "Alpha WEB-DL 1080p x265",
            "Charlie WEB 2160p x265",
            "Bravo BluRay 720p HEVC",
        ]);
    });
});

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
                elements.map(
                    (element) => element.getAttribute("data-result-title")!,
                ),
            ),
        )
        .toEqual(expectedTitles);
}

async function waitForSortingOrFiltering(
    page: import("@playwright/test").Page,
): Promise<void> {
    await expect(page.locator(".block-ui-overlay:visible")).toHaveCount(0);
}

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
                    { indexerName: "One", wasSuccessful: true },
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
    await page.getByRole("button", { name: "Expand duplicates" }).click();
    await expect(rows).toHaveCount(3);
    await page.getByRole("button", { name: "Select all", exact: true }).click();
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
    await page.getByRole("button", { name: "Invert selection" }).click();
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

async function assertLegacyGroupExpansionAndBulkSelection(
    page: import("@playwright/test").Page,
): Promise<void> {
    const rows = page.getByTestId("search-result-row");
    const initialRowCount = await rows.count();
    await page.locator(".duplicate-expand-toggle:not(.visibility-hidden)").click();
    await expect.poll(() => rows.count()).toBeGreaterThan(initialRowCount);
    const selectionButton = page.locator("#search-results-selection-button");
    await selectionButton.locator(".selection-button-toggle-dropdown").click();
    await selectionButton.locator(".selection-button-select-all").click();
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
    await selectionButton.locator(".selection-button-invert-selection").click();
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
