import { dismissWelcomeDialog, expect, test } from "./fixtures";

const movieQuery = "Hydra Browser Movie";

test.describe("Search", () => {
    test.beforeEach(async ({ hydra, page }) => {
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
        const body = (await response.json()) as { searchResults?: unknown[] };
        expect(Array.isArray(body.searchResults)).toBe(true);

        await expect(page.getByTestId("search-status-modal")).toBeHidden();
        await expect(page.getByTestId("search-results")).toBeVisible();
        await expect(
            page
                .getByTestId("search-result-title")
                .filter({ hasText: "indexer1-result1" }),
        ).toBeVisible();
        await expect(
            page
                .getByTestId("search-result-title")
                .filter({ hasText: "indexer2-result1" }),
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
            request?: { searchRequestId?: unknown; loadAll?: unknown };
        };
        expect(typeof savedSearchBody.request?.searchRequestId).toBe("number");
        expect(savedSearchBody.request?.loadAll).toBe(false);
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
        await page.setViewportSize({ width: 390, height: 844 });
        expect(
            await page
                .locator("html")
                .evaluate(
                    (element) => element.scrollWidth <= element.clientWidth,
                ),
        ).toBe(true);
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
        const indexerSelect = page.getByRole("combobox", { name: "Indexers" });
        await indexerSelect.click();
        await page.getByRole("option", { name: "Mock1" }).click();
        await page.getByRole("option", { name: "Mock2" }).click();
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
            page.getByRole("checkbox", { name: "Mock1" }),
        ).not.toBeChecked();
        await page.getByRole("button", { name: "Deselect all" }).click();
        await page
            .getByRole("button", { name: "Select group Secondary" })
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
        await page.goto("ui/react?redirect=/");
        await expect(page).toHaveURL(/\/$/);
        await page.getByRole("combobox", { name: "Indexers" }).click();
        await page.getByRole("option", { name: "Mock1" }).click();
        await page.keyboard.press("Escape");
        await page.getByTestId("search-query").fill("recent criteria");
        await page.getByLabel("Minimum age (days)").fill("2");
        await page.getByLabel("Maximum size (MB)").fill("50");
        const firstSearch = page.waitForResponse((response) =>
            isSearchResponse(response),
        );
        const recentSearches = page.waitForResponse(
            (response) =>
                response.request().method() === "POST" &&
                new URL(response.url()).pathname ===
                    "/internalapi/history/searches/forsearching",
        );
        await page.getByTestId("search-submit").click();
        expect((await firstSearch).request().postDataJSON()).toMatchObject({
            minage: 2,
            maxsize: 50,
            indexers: ["Mock2"],
        });
        const recentSearchResponse = await recentSearches;
        expect(recentSearchResponse.status()).toBe(200);
        expect(await recentSearchResponse.json()).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    query: "recent criteria",
                    minAge: 2,
                    maxSize: 50,
                    selectedIndexers: ["Mock2"],
                }),
            ]),
        );
        await expect(
            page.getByRole("button", { name: "Refill" }).first(),
        ).toBeVisible();
        await page.getByRole("button", { name: "Refill" }).first().click();
        await expect(page.getByLabel("Minimum age (days)")).toHaveValue("2");
        await expect(page.getByLabel("Maximum size (MB)")).toHaveValue("50");
        const repeatedSearch = page.waitForResponse((response) =>
            isSearchResponse(response),
        );
        await page.getByRole("button", { name: "Repeat" }).first().click();
        expect((await repeatedSearch).request().postDataJSON()).toMatchObject({
            query: "recent criteria",
            minage: 2,
            maxsize: 50,
            indexers: ["Mock2"],
        });
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
            page.getByRole("button", { name: "WEB", exact: true }),
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
        await page.getByRole("button", { name: "720p", exact: true }).click();

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

        await page.getByRole("button", { name: "3D", exact: true }).click();
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
                .filter({ hasText: "Hydra Downloader Integration Movie" }),
        ).toBeVisible();
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
                    json: [{ title: "Hydra TV", tvdbId: "31337" }],
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
