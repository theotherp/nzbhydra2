import {randomUUID} from "node:crypto";
import {dismissWelcomeDialog, expect, searchForResult, test, testEnvironment} from "./fixtures";

test.describe("Search history", () => {
    test.beforeEach(async ({hydra, page}) => {
        await hydra.configureMockIndexers(["1", "2"]);
        await page.goto("/");
        await dismissWelcomeDialog(page);
        await expect(page.getByTestId("search-query")).toBeVisible();
    });

    test("should show and repeat a UI search", async ({page}) => {
        const query = `${testEnvironment.searchHistoryQueryPrefix}${randomUUID()}`;
        const category = (await page.getByTestId("search-category-control").textContent())!.trim();
        await searchForResult(page, query, testEnvironment.searchHistoryResultTitle);

        const historyResponse = page.waitForResponse(response => isSearchHistoryResponse(response));
        await page.getByRole("link", {name: "History & Stats", exact: true}).click();
        await page.getByRole("tab", {name: "Search history", exact: true}).click();
        expect((await historyResponse).status()).toBe(200);

        const historyRow = page.getByTestId("search-history-table").getByTestId("search-history-row").filter({hasText: query});
        await refreshUntilHistoryRowIsVisible(page, historyRow);
        await expect(historyRow).toHaveCount(1);
        await expect(historyRow.getByTestId("search-history-category")).toHaveText(category);
        await expect(historyRow.getByTestId("search-history-source")).toHaveText("Internal");

        const repeatedSearchResponse = page.waitForResponse(response => isSearchResponse(response));
        await historyRow.getByTestId("search-history-repeat").click();
        await expect(page.getByTestId("search-query")).toHaveValue(query);
        expect((await repeatedSearchResponse).status()).toBe(200);
        await expect(page.getByTestId("search-status-modal")).toBeHidden();
        await expect(page.getByTestId("search-result-title").filter({hasText: testEnvironment.searchHistoryResultTitle})).toBeVisible();
    });
});

async function refreshUntilHistoryRowIsVisible(
    page: import("@playwright/test").Page,
    historyRow: import("@playwright/test").Locator
): Promise<void> {
    for (let attempt = 0; attempt < 5; attempt++) {
        if (await historyRow.count() === 1) {
            return;
        }
        const response = page.waitForResponse(response => isSearchHistoryResponse(response));
        await page.getByTestId("search-history-refresh").click();
        expect((await response).status()).toBe(200);
    }
    await expect(historyRow).toHaveCount(1, {timeout: 1_000});
}

function isSearchResponse(response: import("@playwright/test").Response): boolean {
    return response.request().method() === "POST" && new URL(response.url()).pathname === "/internalapi/search";
}

function isSearchHistoryResponse(response: import("@playwright/test").Response): boolean {
    return response.request().method() === "POST" && new URL(response.url()).pathname === "/internalapi/history/searches";
}
