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
