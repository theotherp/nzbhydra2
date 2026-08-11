import {dismissWelcomeDialog, expect, searchForResult, test, testEnvironment} from "./fixtures";

test.describe("Search results", () => {
    test.beforeEach(async ({hydra, page}) => {
        await hydra.configureMockIndexers(["1", "2"]);
        await page.goto("/");
        await dismissWelcomeDialog(page);
        await expect(page.getByTestId("search-query")).toBeVisible();
    });

    test("should sort results by title in both directions", async ({page}) => {
        await searchForUiTestResults(page);

        const titleSort = page.getByTestId("sort-title");
        await expect(titleSort).toHaveAttribute("data-sort-direction", "none");
        await titleSort.click();
        await expect(titleSort).toHaveAttribute("data-sort-direction", "ascending");
        await expectVisibleResultTitles(page, testEnvironment.uiTestResultTitles);
        await waitForSortingOrFiltering(page);

        await titleSort.click();
        await expect(titleSort).toHaveAttribute("data-sort-direction", "descending");
        await expectVisibleResultTitles(page, [...testEnvironment.uiTestResultTitles].reverse());
        await waitForSortingOrFiltering(page);
    });

    test("should filter titles and sizes through result controls", async ({page}) => {
        await searchForUiTestResults(page);

        const titleFilter = page.getByTestId("freetext-filter-title");
        await titleFilter.type("indexer1");
        await expectVisibleResultTitles(page, testEnvironment.uiTestResultTitles.slice(0, 3));
        await waitForSortingOrFiltering(page);

        await titleFilter.fill("");
        await titleFilter.press("Backspace");
        await expectVisibleResultTitles(page, testEnvironment.uiTestResultTitles);
        await waitForSortingOrFiltering(page);

        const sizeFilter = page.getByTestId("filter-toggle-size");
        await sizeFilter.locator(".toggle-column-filter").click();
        await page.getByTestId("number-filter-min-size").fill("4");
        await page.getByTestId("number-filter-max-size").fill("5");
        await page.getByTestId("number-filter-apply-size").click();

        await expectVisibleResultTitles(page, testEnvironment.uiTestResultTitles.slice(3));
        await expect(page.getByTestId("search-results-summary")).toHaveText(
            "Loaded 5 (3 filtered, 0 duplicates) of 5 results (rejected 0)"
        );
        await waitForSortingOrFiltering(page);
    });

    test("should match x265 and HEVC quick filters without matching near misses", async ({hydra, page}) => {
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
        await page.getByRole("button", {name: "x265", exact: true}).click();
        await expect.poll(async () => {
            const titles = await resultTitles.allTextContents();
            return titles.length > 0 && titles.every(title => title.toLowerCase().includes("x265"));
        }).toBe(true);

        await page.getByRole("button", {name: "x265", exact: true}).click();
        await page.getByRole("button", {name: "HEVC", exact: true}).click();
        await expect.poll(async () => {
            const titles = await resultTitles.allTextContents();
            return titles.length > 0 && titles.every(title => title.toLowerCase().includes("hevc"));
        }).toBe(true);
    });

    test("should treat invalid title and quick-filter regexes as non-matches", async ({hydra, page}) => {
        const config = await hydra.getConfig();
        const searching = config.searching as Record<string, unknown>;
        searching.showQuickFilterButtons = true;
        searching.alwaysShowQuickFilterButtons = true;
        searching.customQuickFilterButtons = ["Invalid regex=/[/"];
        searching.preselectQuickFilterButtons = ["custom|Invalid regex"];
        await hydra.saveConfig(config);
        await page.reload();

        await page.getByTestId("search-query").fill(testEnvironment.uiTestQuery);
        await page.getByTestId("search-submit").click();
        await expect(page.getByTestId("search-status-modal")).toBeHidden();
        await expect(page.getByTestId("search-result-row")).toHaveCount(0);

        await page.getByRole("button", {name: "Invalid regex", exact: true}).click();
        await expectVisibleResultTitles(page, testEnvironment.uiTestResultTitles);
        await page.getByTestId("freetext-filter-title").type("/[/");
        await expect(page.getByTestId("search-result-row")).toHaveCount(0);
    });

    test("should discard titleless results without interrupting rendering", async ({page}) => {
        await page.route("**/internalapi/search", async route => {
            const response = await route.fetch();
            const body = await response.json() as { searchResults: Array<{ title: string | null }> };
            body.searchResults[0].title = null;
            await route.fulfill({response, json: body});
        });

        await searchForResult(page, testEnvironment.uiTestQuery, "indexer1-result2");
        await expect(page.getByTestId("search-result-row")).toHaveCount(4);
    });

    test("should clear every filtered-out selection", async ({page}) => {
        await searchForUiTestResults(page);

        const firstResult = page.getByTestId("search-result-row").filter({hasText: "indexer1-result1"});
        const secondResult = page.getByTestId("search-result-row").filter({hasText: "indexer1-result2"});
        await firstResult.locator("input[type=checkbox]").check();
        await secondResult.locator("input[type=checkbox]").check();

        const titleFilter = page.getByTestId("freetext-filter-title");
        await titleFilter.type("indexer2");
        await expectVisibleResultTitles(page, testEnvironment.uiTestResultTitles.slice(3));
        await titleFilter.fill("");
        await titleFilter.press("Backspace");

        await expect(firstResult.locator("input[type=checkbox]")).not.toBeChecked();
        await expect(secondResult.locator("input[type=checkbox]")).not.toBeChecked();
    });

    test("should retain the configured title-group page size after recalculation", async ({hydra, page}) => {
        const config = await hydra.getConfig();
        const searching = config.searching as Record<string, unknown>;
        searching.loadLimitInternal = 1;
        await hydra.saveConfig(config);
        await page.reload();

        await page.getByTestId("search-query").fill("titleduplicates");
        await page.getByTestId("search-submit").click();
        await expect(page.getByTestId("search-status-modal")).toBeHidden();

        const rows = page.getByTestId("search-results-table").getByTestId("search-result-row");
        await expect(rows).toHaveCount(1);
        await page.getByTestId("sort-title").click();
        await expect(rows).toHaveCount(1);
    });
});

async function searchForUiTestResults(page: import("@playwright/test").Page): Promise<void> {
    await searchForResult(page, testEnvironment.uiTestQuery, testEnvironment.uiTestResultTitles[0]);
    await expectVisibleResultTitles(page, testEnvironment.uiTestResultTitles);
}

async function expectVisibleResultTitles(page: import("@playwright/test").Page, expectedTitles: string[]): Promise<void> {
    const rows = page.getByTestId("search-results-table").getByTestId("search-result-row");
    await expect(rows).toHaveCount(expectedTitles.length);
    await expect.poll(() => rows.evaluateAll(elements => elements.map(element => element.getAttribute("data-result-title")!)))
        .toEqual(expectedTitles);
}

async function waitForSortingOrFiltering(page: import("@playwright/test").Page): Promise<void> {
    await expect(page.locator(".block-ui-overlay:visible")).toHaveCount(0);
}
