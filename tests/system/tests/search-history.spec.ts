import {randomUUID} from "node:crypto";

import type {Page} from "@playwright/test";
import {
    dismissWelcomeDialog,
    expect,
    openRefineMultiselect,
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
        await page
            .getByTestId("history-refine-bar")
            .getByLabel("Query")
            .fill(query);
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
        await openRefineMultiselect(page, "category");
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

        // FM-165: the refined view is a link. Both committed filters are in
        // the URL, so reloading it re-issues the same filtered request and
        // comes back to the same single row -- where before FM-165 a reload
        // dropped the refinement and returned the unfiltered first page.
        const refinedUrl = page.url();
        expect(refinedUrl).toContain("ft.query=");
        expect(refinedUrl).toContain("cb.category=");
        const reloadedResponse = page.waitForResponse((response) =>
            isSearchHistoryResponse(response),
        );
        await page.reload();
        const reloaded = await reloadedResponse;
        expect(reloaded.status()).toBe(200);
        expect(reloaded.request().postDataJSON()).toMatchObject({
            page: 1,
            filterModel: {
                query: {filterType: "freetext", filterValue: query},
                category_name: {
                    filterType: "checkboxes",
                    filterValue: [category],
                },
            },
        });
        expect(page.url()).toBe(refinedUrl);
        await expect(
            page.getByTestId("history-refine-bar").getByLabel("Query"),
        ).toHaveValue(query);
        await expect(page.getByTestId("history-refine-summary")).toHaveText(
            "2 active filters",
        );
        await expect(historyRow).toHaveCount(1);
    });

    /**
     * FM-174 (owner request 2026-09-01). The row redesign against real data:
     * the Query column carries the query alone, repeating is an icon beside
     * "Details", size and age are one line each, and every value the row
     * stopped printing is in the details dialog. The timestamp is also the
     * only place a real backend can prove `C-DATE-TIME`'s 24-hour clock --
     * the vitest pin formats a fixed instant, this reads whatever the server
     * recorded a moment ago.
     */
    test("should show a decluttered row whose dropped values live in the details dialog", async ({
        page,
    }) => {
        const query = `${testEnvironment.searchHistoryQueryPrefix}${randomUUID()}`;
        await prepareVisualEvidence(page, "desktop", async () => {
            await page.goto("/");
            await dismissWelcomeDialog(page);
            await expect(page.getByTestId("search-query")).toBeVisible();
        });
        // Bounded on both dimensions, which is what makes the row's two range
        // lines real rather than a fixture: the bounds travel with the search
        // request and come back out of the history table. Deliberately narrow
        // -- narrow enough that the mock indexers' results may all be filtered
        // out -- so this submits and waits for the search itself rather than
        // for a result, unlike the sibling tests above: the claim here is
        // about the history row the search writes, not about what it found.
        await page.getByTestId("search-advanced-toggle").click();
        for (const [label, value] of [
            ["Min size", "100"],
            ["Max size", "500"],
            ["Min age", "2"],
            ["Max age", "10"],
        ]) {
            await page.getByLabel(label).fill(value);
        }
        await page.getByTestId("search-query").fill(query);
        const searchResponse = page.waitForResponse((response) =>
            isSearchResponse(response),
        );
        await page.getByTestId("search-submit").click();
        expect((await searchResponse).status()).toBe(200);
        await expect(page.getByTestId("search-status-modal")).toBeHidden();

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

        const cells = historyRow.getByRole("cell");
        // 24-hour, and never an AM/PM string: legacy `reformatDate`'s fixed
        // `HH:mm`, restored in `C-DATE-TIME` for every consumer.
        await expect(cells.nth(0)).toHaveText(/, ([01]\d|2[0-3]):[0-5]\d$/);
        // The Query column holds the query and its copy button, nothing else.
        await expect(cells.nth(1)).toHaveText(query);
        // One line per dimension, and no `<key> ID` line anywhere in the row.
        await expect(cells.nth(3)).toContainText(/Size:\s*100 MB - 500 MB/);
        await expect(cells.nth(3)).toContainText(/Age:\s*2 days - 10 days/);
        await expect(historyRow).not.toContainText(" ID:");

        const repeat = historyRow.getByTestId("search-history-repeat");
        await expect(repeat).toHaveAccessibleName(
            "Repeat this search with all currently enabled indexers.",
        );
        await expect(repeat).toHaveText("");
        // Beside "Details" in the last column, not in the Query cell.
        await expect(
            historyRow
                .locator("td")
                .filter({has: page.getByTestId("search-history-details")})
                .getByTestId("search-history-repeat"),
        ).toBeVisible();
        expect(await pageFitsHorizontally(page)).toBe(true);
        await page.getByTestId("search-history-table").scrollIntoViewIfNeeded();
        await page.screenshot({
            path: visualEvidencePath("F-HISTORY-SEARCHES", "row-desktop"),
        });

        await historyRow.getByTestId("search-history-details").click();
        const requestDetails = page.getByRole("table", {
            name: "Search request details",
        });
        await expect(requestDetails).toBeVisible();
        await expect(requestDetails).toContainText("100 MB - 500 MB");
        await expect(requestDetails).toContainText("2 days - 10 days");
        await page.screenshot({
            path: visualEvidencePath(
                "F-HISTORY-SEARCHES",
                "details-dialog-criteria-desktop",
            ),
        });
        await page.keyboard.press("Escape");
        await expect(
            page.getByRole("dialog", {name: "Search details"}),
        ).toBeHidden();

        await prepareVisualEvidence(page, "mobile", async () => {
            await page.goto("/stats/searches");
            await expect(
                page.getByTestId("search-history-table"),
            ).toBeVisible();
        });
        await expect(historyRow.first()).toBeVisible();
        expect(await pageFitsHorizontally(page)).toBe(true);
        await page.getByTestId("search-history-table").scrollIntoViewIfNeeded();
        await page.screenshot({
            path: visualEvidencePath("F-HISTORY-SEARCHES", "row-mobile"),
        });
        // At 390px the table's right-hand columns are behind its own
        // horizontal scroll, so the capture above shows the Time and Query
        // columns and this one shows the criteria and the repeat icon -- the
        // two halves of the same row.
        await page
            .getByTestId("search-history-scroller")
            .evaluate((element) => {
                element.scrollLeft = element.scrollWidth;
            });
        await page.screenshot({
            path: visualEvidencePath(
                "F-HISTORY-SEARCHES",
                "row-scrolled-mobile",
            ),
        });
    });

    /**
     * The half of FM-174's declutter the case above cannot prove: that a row
     * whose search *carried* an identifier prints no `<key> ID` line, and
     * that the identifier is still reachable -- as a link -- in the details
     * dialog. The sibling above searches by plain text, so its "no ID line"
     * assertion holds vacuously; this one searches by TMDB identifier through
     * the real backend's movie autocomplete (the same route `search.spec.ts`
     * drives), which is what writes `TMDB` into the history entry.
     *
     * The query is the deterministic movie's fixed title, so unlike the
     * UUID-tagged searches above this row may have older siblings from
     * earlier runs; the newest is first under the default time-descending
     * sort, the same way the repeat case at the top of this file finds its
     * row.
     */
    test("should keep an identifier out of the row and reachable as a link in the details dialog", async ({
        page,
    }) => {
        const movieQuery = "Hydra Browser Movie";
        await page.getByTestId("search-category-control").click();
        await page.getByTestId("search-category-option-Movies").click();
        const searchQuery = page.getByTestId("search-query");
        const autocompleteResponse = page.waitForResponse(
            (response) =>
                response.request().method() === "GET" &&
                new URL(response.url()).pathname ===
                    "/internalapi/autocomplete/MOVIE",
        );
        await searchQuery.fill(movieQuery);
        expect((await autocompleteResponse).status()).toBe(200);
        const movieOption = page.locator(
            '[data-testid="autocomplete-option"][data-tmdb-id="424242"]',
        );
        await expect(movieOption).toBeVisible();
        await movieOption.click();
        await expect(searchQuery).toHaveValue(movieQuery);

        const searchResponse = page.waitForResponse((response) =>
            isSearchResponse(response),
        );
        await page.getByTestId("search-submit").click();
        const searchRequest = (await searchResponse).request();
        // The identifier really travelled with the search; without this the
        // row assertions below would hold for the same vacuous reason the
        // sibling case's does.
        expect(searchRequest.postData()).toContain('"tmdbId":"424242"');
        await expect(page.getByTestId("search-status-modal")).toBeHidden();

        await page
            .getByRole("link", {name: "History & Stats", exact: true})
            .click();
        await page
            .getByRole("tab", {name: "Search history", exact: true})
            .click();
        const historyRow = page
            .getByTestId("search-history-table")
            .getByTestId("search-history-row")
            .filter({hasText: movieQuery})
            .first();
        await refreshUntilHistoryRowIsVisible(page, historyRow);

        await expect(historyRow).not.toContainText("TMDB");
        await expect(historyRow).not.toContainText("424242");
        await expect(historyRow).not.toContainText(" ID:");

        await historyRow.getByTestId("search-history-details").click();
        const requestDetails = page.getByRole("table", {
            name: "Search request details",
        });
        await expect(requestDetails).toBeVisible();
        await expect(requestDetails).toContainText("TMDB ID");
        const identifierLink = requestDetails.getByRole("link", {
            name: "424242",
        });
        await expect(identifierLink).toHaveAttribute(
            "href",
            "https://www.themoviedb.org/movie/424242",
        );
        await expect(identifierLink).toHaveAttribute("target", "_blank");
        await page.keyboard.press("Escape");
        await expect(
            page.getByRole("dialog", {name: "Search details"}),
        ).toBeHidden();
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
        // FM-174 re-measured the floor for the new column set (the timestamp
        // no longer wraps, Details holds the repeat icon, Query lost "Repeat"
        // and Additional parameters lost the identifier lines): 752px
        // intrinsic, 760 declared.
        expect(geometry.table).toBeGreaterThanOrEqual(760);
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

        // ADR-0050: the Category dimension is a collapsible multi-select that
        // starts closed, so a freshly opened surface shows its caption row and
        // not a wrapping block of chips.
        const categoryToggle = page.getByTestId(
            "history-refine-category-toggle",
        );
        await expect(categoryToggle).toBeVisible();
        await expect(categoryToggle).toHaveAttribute("aria-expanded", "false");
        await expect(
            page.getByTestId("history-refine-category-list"),
        ).toBeHidden();
        await page.screenshot({
            path: visualEvidencePath(
                "F-HISTORY-SEARCHES",
                "refine-multiselect-collapsed-desktop",
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
        await page
            .getByTestId("history-refine-bar")
            .getByLabel("Query")
            .fill("evidence");
        await openRefineMultiselect(page, "category");
        await page
            .getByTestId("history-refine-category-option")
            .first()
            .click();
        await expect(page.getByTestId("history-refine-summary")).toHaveText(
            "2 active filters",
        );
        await expect(categoryToggle).toHaveAttribute("aria-expanded", "true");
        await page.screenshot({
            path: visualEvidencePath(
                "F-HISTORY-SEARCHES",
                "refine-multiselect-expanded-desktop",
            ),
        });
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
        await page
            .getByTestId("history-refine-bar")
            .getByLabel("Query")
            .fill("evidence");
        await openRefineMultiselect(page, "category");
        await page
            .getByTestId("history-refine-category-option")
            .first()
            .click();
        // With the sections behind a drawer, the compact trigger is where the
        // count has to remain readable.
        await expect(page.getByTestId("history-refine-toggle")).toContainText(
            "2 active filters",
        );
        // FM-142 made "Clear all" icon-only because it wrapped inside its own
        // button in the 216px drawer header FM-137 measured. FM-181 moved it
        // out of that header entirely: the bottom sheet's pinned footer is a
        // full-width row, so the word is back on screen beside a "Done"
        // button, with the accessible name and the test id unchanged.
        const sheetClearAll = page.getByTestId("history-refine-clear-all");
        await expect(sheetClearAll).toHaveAccessibleName("Clear all filters");
        await expect(sheetClearAll).toHaveText("Clear all");
        await expect(page.getByTestId("history-refine-done")).toHaveText(
            "Done",
        );
        // The footer stays on screen however far the sections scroll.
        const [footerBox, sheetViewport] = [
            await sheetClearAll.boundingBox(),
            page.viewportSize(),
        ];
        expect(footerBox).not.toBeNull();
        expect(sheetViewport).not.toBeNull();
        if (!footerBox || !sheetViewport) {
            throw new Error("Sheet footer requires deterministic geometry");
        }
        expect(footerBox.y + footerBox.height).toBeLessThanOrEqual(
            sheetViewport.height + 1,
        );
        await page.screenshot({
            path: visualEvidencePath(
                "F-HISTORY-SEARCHES",
                "refine-surface-drawer-open-mobile",
            ),
        });
        expect(await pageFitsHorizontally(page)).toBe(true);
    });

    /**
     * FM-166: the page size is URL state, so a reload is the whole test --
     * nothing on the client remembers it, and if the parameter did not survive
     * the round trip the reloaded request would ask for 25 again.
     */
    test("should keep a chosen page size in the URL across a reload", async ({
        page,
    }) => {
        const firstRead = page.waitForResponse(isSearchHistoryResponse);
        await page.goto("/stats/searches");
        await dismissWelcomeDialog(page);
        expect((await firstRead).request().postDataJSON()).toMatchObject({
            page: 1,
            limit: 25,
        });
        await expect(
            page.getByTestId("search-history-page-status"),
        ).toContainText("Page 1 of");

        const resized = page.waitForResponse(isSearchHistoryResponse);
        await page.getByRole("combobox", {name: "Rows per page"}).click();
        await page.getByRole("option", {name: "100", exact: true}).click();
        const resizedResponse = await resized;
        expect(resizedResponse.status()).toBe(200);
        // Page 1, not the page the reader was on: a resize cannot ask for a
        // page the new size may have put past the end.
        expect(resizedResponse.request().postDataJSON()).toMatchObject({
            page: 1,
            limit: 100,
        });
        expect(new URL(page.url()).searchParams.get("size")).toBe("100");

        const reloaded = page.waitForResponse(isSearchHistoryResponse);
        await page.reload();
        expect((await reloaded).request().postDataJSON()).toMatchObject({
            page: 1,
            limit: 100,
        });
        await expect(
            page.getByRole("combobox", {name: "Rows per page"}),
        ).toHaveText("100");
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
