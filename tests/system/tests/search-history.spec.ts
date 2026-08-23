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
        // FM-094: React is the served default now, but the navigation stays
        // explicit so every test below states which shell it is about.
        await page.goto("ui/react?redirect=/");
        await dismissWelcomeDialog(page);
        await expect(page.getByTestId("search-query")).toBeVisible();
    });

    // FM-094: the two legacy-shell tests that stood here -- "should show and
    // repeat a UI search" and "should show indexer response times in search
    // details" -- are gone with the legacy shell. Both reached the history
    // through legacy's own nav and tab markup, and the second asserted inside
    // Bootstrap's `.modal-content`, which React does not render.
    //
    // Deleting them was not enough on its own: three of their assertions had no
    // surviving carrier, so they moved into "should repeat and inspect
    // deterministic history in the React shell" below rather than being lost --
    // the same move-the-assertions pattern `downloads.spec.ts` uses. They are
    // the history row's category cell matching the category the search form was
    // submitted with, its source cell reading "Internal", and *both* configured
    // indexers' response-time cells matching `^\d+ms$` in the details table.
    // The sibling's existing `toContainText(/\d+ms/)` at its end matches once
    // anywhere in that table and does not establish the last of those, so it is
    // left in place as the repeated search's own check and the stronger
    // assertion is made on the first search's details.
    //
    // Everything else they asserted was already covered by that sibling: the
    // row appearing exactly once for a fresh UUID query, the repeat button
    // refilling the query field, the repeated search returning 200, and the
    // deterministic result rendering afterwards.

    test("should repeat and inspect deterministic history in the React shell", async ({
        page,
    }) => {
        const query = `${testEnvironment.searchHistoryQueryPrefix}${randomUUID()}`;
        await page.goto("ui/react?redirect=/");
        await dismissWelcomeDialog(page);
        // FM-094: read off the form before searching, so the row's category
        // cell below is compared against what this search was actually
        // submitted with rather than a hard-coded name. The role query, not
        // `getByTestId("search-category-control")`, because React's outlined
        // Select carries its label and the notch's duplicate legend inside that
        // test id -- its `textContent` is "CategoryAllCategory", which is what
        // the deleted legacy test would have compared against had it simply
        // been repointed.
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
        const historyRow = page
            .getByTestId("search-history-table")
            .getByTestId("search-history-row")
            .filter({hasText: query});
        await refreshUntilHistoryRowIsVisible(page, historyRow);
        await expect(historyRow).toHaveCount(1);
        // FM-094: carried over from the deleted legacy "should show and repeat
        // a UI search". No other test asserts these two rendered cells -- the
        // refine-bar test proves the backend's `category_name` value by
        // filtering on it, which is a different claim.
        await expect(
            historyRow.getByTestId("search-history-category"),
        ).toHaveText(category);
        await expect(
            historyRow.getByTestId("search-history-source"),
        ).toHaveText("Internal");

        // FM-094: carried over from the deleted legacy "should show indexer
        // response times in search details". It is made here, on the first
        // search's own details, rather than on the repeated search's at the end
        // of this test: this search demonstrably reached both configured
        // indexers, whereas a repeat inside the result cache's lifetime need
        // not, and the claim is specifically that *every* indexer the search
        // used reports a response time.
        await historyRow.getByTestId("search-history-details").click();
        const relatedIndexerSearches = page.getByRole("table", {
            name: "Related indexer searches",
        });
        await expect(relatedIndexerSearches).toBeVisible();
        await expect(
            relatedIndexerSearches.locator("tbody tr td:nth-child(4)"),
        ).toHaveText([/^\d+ms$/, /^\d+ms$/]);
        const detailsDialog = page.getByRole("dialog", {
            name: "Search details",
        });
        await page.keyboard.press("Escape");
        await expect(detailsDialog).toBeHidden();

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
