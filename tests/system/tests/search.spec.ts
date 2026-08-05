import {dismissWelcomeDialog, expect, test} from "./fixtures";

const movieQuery = "Hydra Browser Movie";

test.describe("Search", () => {
    test.beforeEach(async ({hydra, page}) => {
        await hydra.configureMockIndexers(["1", "2"]);
        await page.goto("/");
        await dismissWelcomeDialog(page);
        await expect(page.getByTestId("search-query")).toBeVisible();
    });

    test("should search configured indexers and render their results", async ({page}) => {
        await page.getByTestId("search-query").fill("uitest");
        const searchResponse = page.waitForResponse(response => isSearchResponse(response));
        await page.getByTestId("search-submit").click();

        const response = await searchResponse;
        expect(response.status()).toBe(200);
        const requestBody = response.request().postDataJSON() as { searchRequestId?: unknown; loadAll?: unknown };
        expect(typeof requestBody.searchRequestId).toBe("number");
        expect(requestBody.loadAll).toBe(false);
        const body = await response.json() as { searchResults?: unknown[] };
        expect(Array.isArray(body.searchResults)).toBe(true);

        await expect(page.getByTestId("search-status-modal")).toBeHidden();
        await expect(page.getByTestId("search-results")).toBeVisible();
        await expect(page.getByTestId("search-result-title").filter({hasText: "indexer1-result1"})).toBeVisible();
        await expect(page.getByTestId("search-result-title").filter({hasText: "indexer2-result1"})).toBeVisible();
        await expect(page.getByTestId("search-results-summary")).toContainText("Loaded 5");
        await expect(page.getByTestId("search-results-summary")).toContainText("of 5 results");

        const savedSearchResponse = page.waitForResponse(response =>
            response.request().method() === "POST" && new URL(response.url()).pathname === "/internalapi/savedsearches");
        await page.locator("#save-search").click();
        const savedSearchBody = (await savedSearchResponse).request().postDataJSON() as {
            request?: { searchRequestId?: unknown; loadAll?: unknown };
        };
        expect(typeof savedSearchBody.request?.searchRequestId).toBe("number");
        expect(savedSearchBody.request?.loadAll).toBe(false);
    });

    test("should select a movie autocomplete result and search by TMDB identifier", async ({page}) => {
        await page.getByTestId("search-category-control").click();
        await page.getByTestId("search-category-option-Movies").click();
        await page.locator("#minsize").fill("");
        await page.locator("#maxsize").fill("");

        const searchQuery = page.getByTestId("search-query");
        await searchQuery.fill(movieQuery.slice(0, -1));
        const autocompleteResponse = page.waitForResponse(response =>
            response.request().method() === "GET" && new URL(response.url()).pathname === "/internalapi/autocomplete/MOVIE");
        await searchQuery.press("End");
        await searchQuery.type(movieQuery.slice(-1));

        const response = await autocompleteResponse;
        expect(response.status()).toBe(200);
        expect(response.headers()["content-type"]).toContain("application/json");
        const autocomplete = await response.json() as Array<{ title?: string; tmdbId?: string; year?: number }>;
        expect(autocomplete).toEqual(expect.arrayContaining([
            expect.objectContaining({title: movieQuery, tmdbId: "424242", year: 2000}),
        ]));

        const movieOption = page.locator("[data-testid=\"autocomplete-option\"][data-tmdb-id=\"424242\"]");
        await expect(movieOption).toBeVisible();
        await movieOption.click();
        await expect(searchQuery).toHaveValue(movieQuery);
        await expect(page.getByTestId("additional-query")).toBeVisible();

        const searchResponse = page.waitForResponse(response => isSearchResponse(response));
        await page.getByTestId("search-submit").click();
        const searchRequest = (await searchResponse).request();
        expect(searchRequest.postData()).toContain("\"tmdbId\":\"424242\"");

        await expect(page.getByTestId("search-status-modal")).toBeHidden();
        await expect(page.getByTestId("search-result-title").filter({hasText: "Hydra Downloader Integration Movie"})).toBeVisible();
    });
});

function isSearchResponse(response: import("@playwright/test").Response): boolean {
    return response.request().method() === "POST" && new URL(response.url()).pathname === "/internalapi/search";
}
