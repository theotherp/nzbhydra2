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
        await page.goto("/");
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
        await page.goto("/");
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
        // refine-surface test proves the backend's `category_name` value by
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

    test("should filter through the shared refine surface against the real backend", async ({
        page,
    }) => {
        const query = `${testEnvironment.searchHistoryQueryPrefix}${randomUUID()}`;
        await page.goto("/");
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

        // Refining happens in the shared refine surface
        // (C-HISTORY-REFINE-BAR docked through C-REFINE-SURFACE), the route's
        // only filter surface. Both the freetext and the multi-select path are
        // exercised against the real backend, and each request body is read to
        // prove the filter actually travelled -- a 200 on an unfiltered body
        // would prove nothing.
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
        // ADR-0046: the active-filter summary renders in the shared shell's
        // header summary slot now, rather than inside the old bar's
        // expand/collapse toggle. Since FM-142 that slot is the whole left
        // side of the header row -- the "Refine" caption it used to sit beside
        // is gone.
        await expect(page.getByTestId("history-refine-summary")).toHaveText(
            "2 active filters",
        );

        const historyRow = page
            .getByTestId("search-history-table")
            .getByTestId("search-history-row")
            .filter({hasText: query});
        await expect(historyRow).toHaveCount(1);
    });

    /**
     * FM-126 (ADR-0038). This table is the one the decision asked to confirm
     * first, and the before-state is worth recording: it had no scrolling
     * ancestor at all, so at 390x844 the *document* measured 687px against a
     * 390px viewport -- a page that scrolled sideways, which ADR-0029 forbids.
     * It now scrolls inside its own container, and says so at whichever edge
     * it is clipping.
     */
    test("should scroll the table inside its container with a scroll-edge affordance at 390px", async ({
        page,
    }) => {
        await prepareVisualEvidence(page, "mobile", async () => {
            await page.goto("/stats/searches");
            await dismissWelcomeDialog(page);
            await expect(
                page.getByTestId("search-history-table"),
            ).toBeVisible();
        });

        // ADR-0029: the page never scrolls sideways, at any point below.
        expect(await pageFitsHorizontally(page)).toBe(true);

        // The table keeps its measured floor and the container scrolls.
        const scroller = page.getByTestId("search-history-scroller");
        const geometry = await scroller.evaluate((element) => ({
            client: element.clientWidth,
            scrollable: element.scrollWidth,
            table: (element.firstElementChild as HTMLElement).clientWidth,
        }));
        expect(geometry.table).toBeGreaterThanOrEqual(700);
        expect(geometry.scrollable).toBeGreaterThan(geometry.client);

        // Clipped on the right only, so only that edge is marked.
        await expect(
            page.getByTestId("table-scroll-affordance-end"),
        ).toBeVisible();
        await expect(
            page.getByTestId("table-scroll-affordance-start"),
        ).toHaveCount(0);
        // The table sits below the page heading row, so bring it into the
        // frame: a strip of the page header is not evidence of a table.
        await page.getByTestId("search-history-table").scrollIntoViewIfNeeded();
        await page.screenshot({
            path: visualEvidencePath(
                "F-HISTORY-SEARCHES",
                "table-scroll-affordance-mobile",
            ),
        });

        // Scrolled to the end: that edge clips nothing any more, so its
        // affordance clears and the opposite edge takes it over.
        await scroller.evaluate((element) => {
            element.scrollLeft = element.scrollWidth;
        });
        await expect(
            page.getByTestId("table-scroll-affordance-end"),
        ).toHaveCount(0);
        await expect(
            page.getByTestId("table-scroll-affordance-start"),
        ).toBeVisible();
        expect(await pageFitsHorizontally(page)).toBe(true);
        // The table sits below the page heading row, so bring it into the
        // frame: a strip of the page header is not evidence of a table.
        await page.getByTestId("search-history-table").scrollIntoViewIfNeeded();
        await page.screenshot({
            path: visualEvidencePath(
                "F-HISTORY-SEARCHES",
                "table-scroll-affordance-scrolled-mobile",
            ),
        });

        // Desktop: nothing is clipped, so there is no affordance to show.
        await prepareVisualEvidence(page, "desktop", async () => {
            await page.goto("/stats/searches");
            await expect(
                page.getByTestId("search-history-table"),
            ).toBeVisible();
        });
        await expect(
            page.getByTestId("table-scroll-affordance-end"),
        ).toHaveCount(0);
        await expect(
            page.getByTestId("table-scroll-affordance-start"),
        ).toHaveCount(0);
        // The table sits below the page heading row, so bring it into the
        // frame: a strip of the page header is not evidence of a table.
        await page.getByTestId("search-history-table").scrollIntoViewIfNeeded();
        await page.screenshot({
            path: visualEvidencePath(
                "F-HISTORY-SEARCHES",
                "table-scroll-affordance-desktop",
            ),
        });
    });

    /**
     * ADR-0046 (FM-137): the two viewports are no longer the same flow with a
     * different width. At 1280px the surface is a docked column that collapses
     * to a rail in place; at 390px that branch does not exist at all and the
     * sections are reachable only through the drawer the compact "Refine"
     * trigger opens. Exactly one branch is in the DOM at a time, which is what
     * the `toHaveCount(0)` assertions below pin.
     */
    test("should capture the search history refine surface visual evidence", async ({
        page,
    }) => {
        await prepareVisualEvidence(page, "desktop", async () => {
            await page.goto("/stats/searches");
            await dismissWelcomeDialog(page);
            await expect(page.getByTestId("history-refine-bar")).toBeVisible();
        });
        const toggle = page.getByTestId("history-refine-toggle");
        await expect(page.getByTestId("history-refine-summary")).toHaveText(
            "No active filters",
        );
        await expectSingleLineRefineHeader(page);
        await page.screenshot({
            path: visualEvidencePath(
                "F-HISTORY-SEARCHES",
                "refine-surface-expanded-desktop",
            ),
        });

        await toggle.click();
        await expect(toggle).toHaveAttribute("aria-expanded", "false");
        // The rail has room for the toggle alone, so the summary it hides is
        // carried by the accessible name of the control that reveals it.
        await expect(toggle).toHaveAccessibleName(
            "Expand history filters, No active filters",
        );
        await page.screenshot({
            path: visualEvidencePath(
                "F-HISTORY-SEARCHES",
                "refine-surface-collapsed-desktop",
            ),
        });

        await toggle.click();
        await expect(toggle).toHaveAttribute("aria-expanded", "true");
        await page.getByLabel("Query").fill("evidence");
        await page
            .getByTestId("history-refine-category-option")
            .first()
            .click();
        await expect(page.getByTestId("history-refine-summary")).toHaveText(
            "2 active filters",
        );
        await expectSingleLineRefineHeader(page);
        await page.screenshot({
            path: visualEvidencePath(
                "F-HISTORY-SEARCHES",
                "refine-surface-active-desktop",
            ),
        });
        expect(await pageFitsHorizontally(page)).toBe(true);

        await prepareVisualEvidence(page, "mobile", async () => {
            await page.goto("/stats/searches");
            await dismissWelcomeDialog(page);
            await expect(
                page.getByTestId("history-refine-toggle"),
            ).toBeVisible();
        });
        // The docked branch is not merely hidden below 768px; it is absent,
        // and the drawer starts closed however the desktop column was left.
        await expect(page.getByTestId("history-refine-bar")).toHaveCount(0);
        await expect(page.getByTestId("history-refine-toggle")).toHaveAttribute(
            "aria-expanded",
            "false",
        );
        await page.screenshot({
            path: visualEvidencePath(
                "F-HISTORY-SEARCHES",
                "refine-surface-drawer-closed-mobile",
            ),
        });

        await page.getByTestId("history-refine-toggle").click();
        await expect(page.getByTestId("history-refine-bar")).toBeVisible();
        await page.getByLabel("Query").fill("evidence");
        await page
            .getByTestId("history-refine-category-option")
            .first()
            .click();
        // With the sections behind a drawer, the compact trigger is where the
        // count has to remain readable.
        await expect(page.getByTestId("history-refine-toggle")).toContainText(
            "2 active filters",
        );
        // FM-142: the drawer's own header carries no summary (the trigger
        // above holds the count), so what FM-137 recorded wrapping inside the
        // drawer was the "Clear all" text button. It is icon-only now, with no
        // text left to break over a second line.
        const drawerClearAll = page.getByTestId("history-refine-clear-all");
        await expect(drawerClearAll).toHaveAccessibleName("Clear all filters");
        await expect(drawerClearAll).toHaveText("");
        await page.screenshot({
            path: visualEvidencePath(
                "F-HISTORY-SEARCHES",
                "refine-surface-drawer-open-mobile",
            ),
        });
        expect(await pageFitsHorizontally(page)).toBe(true);
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

// ADR-0029: the page itself never scrolls sideways -- horizontal overflow
// belongs to a table's own `TableScrollAffordance` scroller, never to the
// document.
async function pageFitsHorizontally(
    page: import("@playwright/test").Page,
): Promise<boolean> {
    return page
        .locator("html")
        .evaluate((element) => element.scrollWidth <= element.clientWidth);
}

/**
 * FM-142. FM-137 measured the docked header at 248px -- 216px inside the
 * shell's `px: 2` padding -- holding a "Refine" caption, this summary, a
 * "Clear all" text button and the collapse toggle, and recorded the result:
 * "No active filters" broke over two lines. The caption is gone and clear-all
 * is icon-only, so the summary and the controls share one line. Pinned as a
 * geometry assertion rather than left to the screenshot alone because
 * README's Visual Gate allows one for a regression that actually happened.
 */
async function expectSingleLineRefineHeader(
    page: import("@playwright/test").Page,
): Promise<void> {
    const summary = page.getByTestId("history-refine-summary");
    await expect(page.getByTestId("history-refine-clear-all")).toHaveText("");
    const metrics = await summary.evaluate((element) => ({
        fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
        height: element.getBoundingClientRect().height,
        // `noWrap` would hide a too-narrow slot behind an ellipsis instead of
        // a wrap, which is no better: the whole sentence has to be readable.
        truncated: element.scrollWidth > element.clientWidth,
    }));
    expect(metrics.truncated).toBe(false);
    // A second line of an 11px caption puts the box well past twice its font
    // size; a single line stays under it whatever line-height resolves to.
    expect(metrics.height).toBeLessThan(metrics.fontSize * 2);

    // And the icon-only control shares that line rather than sitting below it.
    const summaryBox = await summary.boundingBox();
    const clearAllBox = await page
        .getByTestId("history-refine-clear-all")
        .boundingBox();
    if (!summaryBox || !clearAllBox) {
        throw new Error("The refine header requires deterministic geometry");
    }
    const summaryCentre = summaryBox.y + summaryBox.height / 2;
    const clearAllCentre = clearAllBox.y + clearAllBox.height / 2;
    expect(Math.abs(summaryCentre - clearAllCentre)).toBeLessThan(2);
}
