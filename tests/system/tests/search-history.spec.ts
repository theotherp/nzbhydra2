import {randomUUID} from "node:crypto";
import {
    dismissWelcomeDialog,
    expect,
    searchForResult,
    test,
    testEnvironment,
} from "./fixtures";
import {prepareVisualEvidence, visualEvidencePath} from "./visualEvidence";

test.describe("Search history", () => {
    test.beforeEach(async ({hydra, page}) => {
        await hydra.configureMockIndexers(["1", "2"]);
        await page.goto("/");
        await dismissWelcomeDialog(page);
        await expect(page.getByTestId("search-query")).toBeVisible();
    });

    test("should show and repeat a UI search", async ({page}) => {
        const query = `${testEnvironment.searchHistoryQueryPrefix}${randomUUID()}`;
        const category = (await page
            .getByTestId("search-category-control")
            .textContent())!.trim();
        await searchForResult(
            page,
            query,
            testEnvironment.searchHistoryResultTitle,
        );

        const historyResponse = page.waitForResponse((response) =>
            isSearchHistoryResponse(response),
        );
        await page
            .getByRole("link", {name: "History & Stats", exact: true})
            .click();
        await page
            .getByRole("tab", {name: "Search history", exact: true})
            .click();
        expect((await historyResponse).status()).toBe(200);

        const historyRow = page
            .getByTestId("search-history-table")
            .getByTestId("search-history-row")
            .filter({hasText: query});
        await refreshUntilHistoryRowIsVisible(page, historyRow);
        await expect(historyRow).toHaveCount(1);
        await expect(
            historyRow.getByTestId("search-history-category"),
        ).toHaveText(category);
        await expect(
            historyRow.getByTestId("search-history-source"),
        ).toHaveText("Internal");

        const repeatedSearchResponse = page.waitForResponse((response) =>
            isSearchResponse(response),
        );
        await historyRow.getByTestId("search-history-repeat").click();
        await expect(page.getByTestId("search-query")).toHaveValue(query);
        expect((await repeatedSearchResponse).status()).toBe(200);
        await expect(page.getByTestId("search-status-modal")).toBeHidden();
        await expect(
            page
                .getByTestId("search-result-title")
                .filter({hasText: testEnvironment.searchHistoryResultTitle}),
        ).toBeVisible();
    });

    test("should show indexer response times in search details", async ({
        page,
    }) => {
        const query = `${testEnvironment.searchHistoryQueryPrefix}${randomUUID()}`;
        await searchForResult(
            page,
            query,
            testEnvironment.searchHistoryResultTitle,
        );

        await page
            .getByRole("link", {name: "History & Stats", exact: true})
            .click();
        await page
            .getByRole("tab", {name: "Search history", exact: true})
            .click();

        const historyRow = page
            .getByTestId("search-history-table")
            .getByTestId("search-history-row")
            .filter({hasText: query});
        await refreshUntilHistoryRowIsVisible(page, historyRow);
        await historyRow.getByTestId("search-history-details").click();

        const detailsModal = page
            .locator(".modal-content")
            .filter({hasText: "Related indexer searches"});
        await expect(detailsModal).toBeVisible();
        const responseTimes = detailsModal
            .locator("table")
            .filter({hasText: "Related indexer searches"})
            .locator("tbody tr td:nth-child(4)");
        await expect(responseTimes).toHaveText([/^\d+ms$/, /^\d+ms$/]);
    });

    test("should repeat and inspect deterministic history in the React shell", async ({
        page,
    }) => {
        const query = `${testEnvironment.searchHistoryQueryPrefix}${randomUUID()}`;
        await page.goto("ui/react?redirect=/");
        await dismissWelcomeDialog(page);
        await searchForResult(
            page,
            query,
            testEnvironment.searchHistoryResultTitle,
        );

        const historyResponse = page.waitForResponse((response) =>
            isSearchHistoryResponse(response),
        );
        await page
            .getByRole("link", {name: "History & Stats", exact: true})
            .click();
        await page
            .getByRole("tab", {name: "Search history", exact: true})
            .click();
        const historyRow = page
            .getByTestId("search-history-table")
            .getByTestId("search-history-row")
            .filter({hasText: query});
        await refreshUntilHistoryRowIsVisible(page, historyRow);
        await expect(historyRow).toHaveCount(1);

        const repeatedSearchResponse = page.waitForResponse((response) =>
            isSearchResponse(response),
        );
        await historyRow.getByTestId("search-history-repeat").click();
        await expect(page.getByTestId("search-query")).toHaveValue(query);
        expect((await repeatedSearchResponse).status()).toBe(200);
        await expect(
            page
                .getByTestId("search-result-title")
                .filter({hasText: testEnvironment.searchHistoryResultTitle}),
        ).toBeVisible();

        await page
            .getByRole("link", {name: "History & Stats", exact: true})
            .click();
        await page
            .getByRole("tab", {name: "Search history", exact: true})
            .click();
        const repeatedRow = page
            .getByTestId("search-history-table")
            .getByTestId("search-history-row")
            .filter({hasText: query})
            .first();
        await refreshUntilHistoryRowIsVisible(page, repeatedRow);
        await repeatedRow.getByTestId("search-history-details").click();
        await expect(
            page.getByRole("table", {name: "Related indexer searches"}),
        ).toContainText(/\d+ms/);
    });

    test("should filter through the shared refine bar against the real backend", async ({
        page,
    }) => {
        const query = `${testEnvironment.searchHistoryQueryPrefix}${randomUUID()}`;
        await page.goto("ui/react?redirect=/");
        await dismissWelcomeDialog(page);
        const category = (await page
            .getByRole("combobox", {name: "Category"})
            .textContent())!.trim();
        await searchForResult(
            page,
            query,
            testEnvironment.searchHistoryResultTitle,
        );

        const historyResponse = page.waitForResponse((response) =>
            isSearchHistoryResponse(response),
        );
        await page
            .getByRole("link", {name: "History & Stats", exact: true})
            .click();
        await page
            .getByRole("tab", {name: "Search history", exact: true})
            .click();
        expect((await historyResponse).status()).toBe(200);

        // Refining happens in the shared refine bar (C-HISTORY-REFINE-BAR),
        // the route's only filter surface. Both the freetext and the
        // multi-select path are exercised against the real backend, and each
        // request body is read to prove the filter actually travelled -- a
        // 200 on an unfiltered body would prove nothing.
        await expect(page.getByTestId("history-refine-bar")).toBeVisible();
        const filteredResponse = page.waitForResponse((response) =>
            isSearchHistoryResponse(response),
        );
        await page.getByLabel("Query").fill(query);
        const filtered = await filteredResponse;
        expect(filtered.status()).toBe(200);
        expect(filtered.request().postDataJSON()).toMatchObject({
            page: 1,
            filterModel: {
                query: {filterType: "freetext", filterValue: query},
            },
        });

        const multiSelectResponse = page.waitForResponse((response) =>
            isSearchHistoryResponse(response),
        );
        await page
            .getByTestId("history-refine-category-option")
            .filter({hasText: category})
            .click();
        const multiSelected = await multiSelectResponse;
        expect(multiSelected.status()).toBe(200);
        expect(multiSelected.request().postDataJSON()).toMatchObject({
            filterModel: {
                query: {filterType: "freetext", filterValue: query},
                category_name: {
                    filterType: "checkboxes",
                    filterValue: [category],
                },
            },
        });
        await expect(page.getByTestId("history-refine-toggle")).toContainText(
            "2 active filters",
        );

        const historyRow = page
            .getByTestId("search-history-table")
            .getByTestId("search-history-row")
            .filter({hasText: query});
        await expect(historyRow).toHaveCount(1);
    });

    test("should capture the search history refine bar visual evidence", async ({
        page,
    }) => {
        for (const viewport of ["desktop", "mobile"] as const) {
            await prepareVisualEvidence(page, viewport, async () => {
                await page.goto("ui/react?redirect=/stats/searches");
                await dismissWelcomeDialog(page);
                await expect(
                    page.getByTestId("history-refine-bar"),
                ).toBeVisible();
            });
            const toggle = page.getByTestId("history-refine-toggle");
            await page.screenshot({
                path: visualEvidencePath(
                    "F-HISTORY-SEARCHES",
                    `refine-bar-expanded-${viewport}`,
                ),
            });

            await toggle.click();
            await expect(toggle).toHaveAttribute("aria-expanded", "false");
            await page.screenshot({
                path: visualEvidencePath(
                    "F-HISTORY-SEARCHES",
                    `refine-bar-collapsed-${viewport}`,
                ),
            });

            await toggle.click();
            await expect(toggle).toHaveAttribute("aria-expanded", "true");
            await page.getByLabel("Query").fill("evidence");
            await page
                .getByTestId("history-refine-category-option")
                .first()
                .click();
            await expect(toggle).toContainText("2 active filters");
            await page.screenshot({
                path: visualEvidencePath(
                    "F-HISTORY-SEARCHES",
                    `refine-bar-active-${viewport}`,
                ),
            });
            expect(
                await page
                    .locator("html")
                    .evaluate(
                        (element) => element.scrollWidth <= element.clientWidth,
                    ),
            ).toBe(true);
        }
    });
});

async function refreshUntilHistoryRowIsVisible(
    page: import("@playwright/test").Page,
    historyRow: import("@playwright/test").Locator,
): Promise<void> {
    for (let attempt = 0; attempt < 5; attempt++) {
        if ((await historyRow.count()) === 1) {
            return;
        }
        const response = page.waitForResponse((response) =>
            isSearchHistoryResponse(response),
        );
        await page.getByTestId("search-history-refresh").click();
        expect((await response).status()).toBe(200);
    }
    await expect(historyRow).toHaveCount(1, {timeout: 1_000});
}

function isSearchResponse(
    response: import("@playwright/test").Response,
): boolean {
    return (
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/internalapi/search"
    );
}

function isSearchHistoryResponse(
    response: import("@playwright/test").Response,
): boolean {
    return (
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/internalapi/history/searches"
    );
}
