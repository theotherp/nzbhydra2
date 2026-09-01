import type {Page} from "@playwright/test";

import {dismissWelcomeDialog, expect, test} from "./fixtures";
import {prepareVisualEvidence, visualEvidencePath} from "./visualEvidence";

const statisticSwitches = [
    "indexerApiAccessStats",
    "avgIndexerUniquenessScore",
    "avgResponseTimes",
    "indexerDownloadShares",
    "downloadsPerDayOfWeek",
    "downloadsPerHourOfDay",
    "searchesPerDayOfWeek",
    "searchesPerHourOfDay",
    "downloadsPerAgeStats",
    "successfulDownloadsPerIndexer",
    "downloadSharesPerUser",
    "downloadSharesPerIp",
    "searchSharesPerUser",
    "searchSharesPerIp",
    "userAgentSearchShares",
    "userAgentDownloadShares",
];

// FM-094: what this pins -- that the stats route sends every statistic switch
// plus `includeDisabled` as a boolean -- is a request-shape claim, not a shell
// one, and React makes it too, so the test was kept when the legacy shell it
// was written against stopped being served. FM-095 removed the last shell
// there was to state, leaving the plain root navigation below. Every
// assertion is unchanged.
test("should send a complete stats request", async ({page}) => {
    await page.goto("/");
    await dismissWelcomeDialog(page);

    const statsResponse = page.waitForResponse(
        (response) =>
            response.request().method() === "POST" &&
            new URL(response.url()).pathname === "/internalapi/stats",
    );
    await page
        .getByRole("link", {name: "History & Stats", exact: true})
        .click();
    await page.getByRole("tab", {name: "Stats", exact: true}).click();

    const requestBody = (await statsResponse)
        .request()
        .postDataJSON() as Record<string, unknown>;
    expect(typeof requestBody.includeDisabled).toBe("boolean");
    for (const statisticSwitch of statisticSwitches) {
        expect(typeof requestBody[statisticSwitch], statisticSwitch).toBe(
            "boolean",
        );
    }
});

test("should render React indexer statuses and canonical history tabs responsively", async ({
    page,
}, testInfo) => {
    const applicationBaseUrl = new URL(`${testInfo.project.use.baseURL}/`);
    const applicationUrl = (path: string) =>
        new URL(path, applicationBaseUrl).toString();
    await page.route("**/internalapi/indexerstatuses", async (route) => {
        await route.fulfill({
            contentType: "application/json",
            body: JSON.stringify([
                {
                    indexer: "Zulu",
                    state: "DISABLED_SYSTEM_TEMPORARY",
                    disabledUntil: "2030-01-02T00:00:00Z",
                    lastError: "Quota reached",
                    apiHits: 4,
                    apiHitLimit: 5,
                    downloadHits: 1,
                    downloadHitLimit: 2,
                    apiResetTime: "2030-01-03T00:00:00Z",
                    vipExpirationDate: "2020-01-01",
                },
                {indexer: "Alpha", state: "ENABLED", apiHits: 0},
                {indexer: "Malformed"},
            ]),
        });
    });
    await page.goto(applicationUrl("/stats"));
    await expect(page).toHaveURL(/\/stats$/);
    await expect(
        page.getByRole("tab", {name: "Indexer statuses"}),
    ).toBeVisible();
    await expect(page.getByRole("tab", {name: "Search history"})).toBeVisible();
    await expect(page.getByRole("tab", {name: "Saved searches"})).toBeVisible();
    await expect(
        page.getByRole("table", {name: "Indexer statuses"}),
    ).toContainText("Quota reached");
    await expect(page.getByLabel("VIP access expired")).toBeVisible();
    // Anchored to the most recent toast: FM-084 made toasts stack, so a second
    // one raised in the same test leaves two alerts in the DOM and an
    // unanchored role locator trips strict mode.
    await expect(page.getByRole("alert").last()).toContainText("malformed");

    await page.setViewportSize({width: 390, height: 844});
    expect(
        await page
            .locator("html")
            .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);
    await page.getByRole("tab", {name: "Saved searches"}).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/stats\/saved-searches$/);
    await expect(
        page.getByRole("tab", {name: "Indexer statuses"}),
    ).toBeVisible();
    await expect(page.getByRole("tab", {name: "Saved searches"})).toBeVisible();
});

function statsResponseFixture(overrides: Record<string, unknown> = {}) {
    return {
        after: "2026-01-01T00:00:00Z",
        before: "2026-02-01T00:00:00Z",
        numberOfConfiguredIndexers: 2,
        numberOfEnabledIndexers: 2,
        avgResponseTimes: [
            {indexer: "Alpha", avgResponseTime: 120, delta: 5},
            {indexer: "Beta", avgResponseTime: 340, delta: -2},
        ],
        indexerScores: [
            {
                indexerName: "Alpha",
                averageUniquenessScore: 4,
                involvedSearches: 100,
                uniqueDownloads: 3,
                providedDownloads: 80,
                coveragePercent: 80,
                sharedContribution: 1.5,
                sharedContributionPercent: 20,
                correctedObservations: 42,
            },
        ],
        indexerDownloadShares: [
            {indexerName: "Alpha", total: 30, share: 75},
            {indexerName: "Beta", total: 10, share: 25},
        ],
        indexerApiAccessStats: [
            {
                indexerName: "Alpha",
                percentSuccessful: 95,
                percentConnectionError: 5,
                averageAccessesPerDay: 12,
            },
        ],
        downloadsPerDayOfWeek: [
            {day: "Mon", count: 5},
            {day: "Tue", count: 2},
        ],
        downloadsPerHourOfDay: [{hour: 3, count: 4}],
        searchesPerDayOfWeek: [
            {day: "Mon", count: 9},
            {day: "Tue", count: 4},
        ],
        searchesPerHourOfDay: [{hour: 3, count: 6}],
        downloadsPerAgeStats: {
            averageAge: 45,
            percentOlder1000: 2,
            percentOlder2000: 1,
            percentOlder3000: 0,
            downloadsPerAge: [{age: 100, count: 3}],
        },
        successfulDownloadsPerIndexer: [
            {
                indexerName: "Alpha",
                countAll: 20,
                countSuccessful: 18,
                countError: 2,
                percentSuccessful: 90,
            },
        ],
        downloadSharesPerUser: [{key: "bob", count: 2, percentage: 50}],
        downloadSharesPerIp: [{key: "1.2.3.4", count: 2, percentage: 50}],
        searchSharesPerUser: [{key: "bob", count: 3, percentage: 60}],
        searchSharesPerIp: [{key: "1.2.3.4", count: 3, percentage: 60}],
        userAgentSearchShares: [{userAgent: "curl", count: 1, percentage: 100}],
        userAgentDownloadShares: [
            {userAgent: "curl", count: 1, percentage: 100},
        ],
        ...overrides,
    };
}

test.describe("React aggregate statistics dashboard", () => {
    test("renders overview tiles, the indexer table, and representative values", async ({
        page,
    }, testInfo) => {
        const applicationBaseUrl = new URL(`${testInfo.project.use.baseURL}/`);
        const applicationUrl = (path: string) =>
            new URL(path, applicationBaseUrl).toString();
        await page.route("**/internalapi/stats", async (route) => {
            await route.fulfill({
                contentType: "application/json",
                body: JSON.stringify(statsResponseFixture()),
            });
        });
        await page.goto(applicationUrl("/stats/stats"));
        await expect(page).toHaveURL(/\/stats\/stats$/);
        await expect(
            page.getByTestId("stats-tile-total-searches"),
        ).toContainText("13");
        await expect(
            page.getByTestId("stats-tile-total-downloads"),
        ).toContainText("7");
        await expect(
            page.getByRole("table", {name: "Indexer statistics"}),
        ).toContainText("Alpha");
        await expect(
            page.getByRole("table", {name: "Indexer statistics"}),
        ).toContainText("120");
        await expect(page.getByTestId("stats-age-average")).toContainText("45");

        await page.setViewportSize({width: 390, height: 844});
        expect(
            await page
                .locator("html")
                .evaluate(
                    (element) => element.scrollWidth <= element.clientWidth,
                ),
        ).toBe(true);
    });

    test("family selection round trip: deselect skips calculation, re-enable merges without losing other families", async ({
        page,
    }, testInfo) => {
        const applicationBaseUrl = new URL(`${testInfo.project.use.baseURL}/`);
        const applicationUrl = (path: string) =>
            new URL(path, applicationBaseUrl).toString();
        await page.route("**/internalapi/stats", async (route) => {
            await route.fulfill({
                contentType: "application/json",
                body: JSON.stringify(statsResponseFixture()),
            });
        });
        await page.goto(applicationUrl("/stats/stats"));
        await expectChartDrawn(page, "stats-chart-response-times");
        await expectChartDrawn(page, "stats-chart-indexer-download-shares");

        await page.getByTestId("stats-family-menu-button").click();
        await page.getByTestId("stats-family-avgResponseTimes").click();
        await page.keyboard.press("Escape");
        // Checked with the surviving card in view, so the deselected card's
        // absence is a real absence and not merely a card below the fold.
        await expectChartDrawn(page, "stats-chart-indexer-download-shares");
        await expect(
            page.getByTestId("stats-chart-response-times"),
        ).toHaveCount(0);

        const singleFamilyRequest = page.waitForResponse(
            (response) =>
                response.request().method() === "POST" &&
                new URL(response.url()).pathname === "/internalapi/stats",
        );
        await page.getByTestId("stats-family-menu-button").click();
        await page.getByTestId("stats-family-avgResponseTimes").click();
        const requestBody = (await singleFamilyRequest)
            .request()
            .postDataJSON() as Record<string, unknown>;
        expect(requestBody.avgResponseTimes).toBe(true);
        expect(requestBody.indexerDownloadShares).toBe(false);
        await page.keyboard.press("Escape");
        await expectChartDrawn(page, "stats-chart-response-times");
        // Re-enabling one family did not discard the previously held one.
        await expectChartDrawn(page, "stats-chart-indexer-download-shares");
    });

    test("date presets and include-disabled apply immediately; custom range validates before sending", async ({
        page,
    }, testInfo) => {
        const applicationBaseUrl = new URL(`${testInfo.project.use.baseURL}/`);
        const applicationUrl = (path: string) =>
            new URL(path, applicationBaseUrl).toString();
        await page.route("**/internalapi/stats", async (route) => {
            await route.fulfill({
                contentType: "application/json",
                body: JSON.stringify(statsResponseFixture()),
            });
        });
        await page.goto(applicationUrl("/stats/stats"));
        await expect(page.getByTestId("stats-dashboard")).toBeVisible();

        const presetRequest = page.waitForResponse(
            (response) =>
                response.request().method() === "POST" &&
                new URL(response.url()).pathname === "/internalapi/stats",
        );
        await page.getByTestId("stats-date-preset-last7").click();
        await presetRequest;

        const disabledRequest = page.waitForResponse(
            (response) =>
                response.request().method() === "POST" &&
                new URL(response.url()).pathname === "/internalapi/stats",
        );
        await page.getByTestId("stats-include-disabled-toggle").click();
        const disabledBody = (await disabledRequest)
            .request()
            .postDataJSON() as Record<string, unknown>;
        expect(disabledBody.includeDisabled).toBe(true);

        await page.getByTestId("stats-date-preset-custom").click();
        const afterInput = page
            .getByTestId("stats-custom-after")
            .locator("input");
        await afterInput.fill("2099-01-01");
        await expect(
            page.getByText(
                "The After date must be earlier than the Before date.",
            ),
        ).toBeVisible();
    });

    test("should capture the dashboard's full screenshot strip", async ({
        page,
    }, testInfo) => {
        const applicationBaseUrl = new URL(`${testInfo.project.use.baseURL}/`);
        const applicationUrl = (path: string) =>
            new URL(path, applicationBaseUrl).toString();
        await page.route("**/internalapi/stats", async (route) => {
            await route.fulfill({
                contentType: "application/json",
                body: JSON.stringify(statsResponseFixture()),
            });
        });
        for (const viewport of ["desktop", "mobile"] as const) {
            await prepareVisualEvidence(page, viewport, async () => {
                await page.goto(applicationUrl("/stats/stats"));
                await dismissWelcomeDialog(page);
                await expect(page.getByTestId("stats-dashboard")).toBeVisible();
                await expect(
                    page.getByTestId("stats-overview-tiles"),
                ).toBeVisible();
            });
            // First paint: the below-fold cards hold placeholders of their
            // charts' own heights (FM-164), so this frame is exactly as tall
            // as the scrolled one below.
            await page.screenshot({
                path: visualEvidencePath(
                    "F-STATS-MAIN",
                    `dashboard-${viewport}`,
                ),
                fullPage: true,
            });
            if (viewport !== "desktop") continue;
            const heightAtFirstPaint = await page.evaluate(
                () => document.body.scrollHeight,
            );
            // Walked in document order, the way a reader reaches them: every
            // card's chart draws once it is reached, and the placeholder is
            // gone by the time it does.
            for (const testId of [
                "stats-chart-indexer-download-shares",
                "stats-chart-response-times",
                "stats-chart-activity-day-of-week",
                "stats-chart-activity-hour-of-day",
                "stats-chart-search-agent",
                "stats-chart-download-agent",
                "stats-chart-downloads-per-age",
            ]) {
                await expectChartDrawn(page, testId);
            }
            await page.evaluate(() => {
                globalThis.scrollTo(0, document.body.scrollHeight);
            });
            await page.screenshot({
                path: visualEvidencePath(
                    "F-STATS-MAIN",
                    "dashboard-desktop-scrolled",
                ),
                fullPage: true,
            });
            // The point of the reserved placeholders: the page is exactly as
            // tall before any chart has mounted as it is once all of them
            // have, so no card ever moves under the reader's pointer.
            expect(await page.evaluate(() => document.body.scrollHeight)).toBe(
                heightAtFirstPaint,
            );
        }
    });
});

// FM-121: the real-browser counterpart of `App.test.tsx`'s two unit tests. It
// is deliberately not "a tab strip is visible after a switch" -- that passed
// against the seven sibling routes too, each of which rendered its own strip.
// Marking the live node is what distinguishes one surviving shell from a
// freshly mounted replacement, and the request count is what the remount used
// to throw away.
test("should keep one stats shell and its cached tab across a tab switch", async ({
    page,
}) => {
    let indexerStatusRequests = 0;
    await page.route("**/internalapi/indexerstatuses", async (route) => {
        indexerStatusRequests += 1;
        await route.continue();
    });

    await page.goto("/");
    await dismissWelcomeDialog(page);
    await page
        .getByRole("link", {name: "History & Stats", exact: true})
        .click();

    const tabStrip = page.getByRole("tablist", {
        name: "History and statistics",
    });
    await expect(
        page.getByRole("heading", {name: "Indexer statuses"}),
    ).toBeVisible();
    await expect.poll(() => indexerStatusRequests).toBe(1);
    await tabStrip.evaluate((element) =>
        element.setAttribute("data-fm121-instance", "first"),
    );

    await page
        .getByRole("tab", {name: "Notification history", exact: true})
        .click();
    await expect(page).toHaveURL(/\/stats\/notifications$/);
    await page
        .getByRole("tab", {name: "Indexer statuses", exact: true})
        .click();
    await expect(
        page.getByRole("heading", {name: "Indexer statuses"}),
    ).toBeVisible();

    // The same DOM node, so the shell (and every tab body's cache entry with
    // it) was never unmounted...
    await expect(tabStrip).toHaveAttribute("data-fm121-instance", "first");
    // ...and the revisited tab came from the cache rather than the network.
    // A brief settle window, mirroring the unit test's 20ms `settle()`: a
    // refetch fired just after the heading became visible would otherwise
    // race this assertion and be missed.
    await page.waitForTimeout(500);
    expect(indexerStatusRequests).toBe(1);
});

/**
 * FM-164: a chart card is always in the layout (its placeholder reserves the
 * chart's height), but the chart itself mounts only once the card reaches the
 * viewport. Asserting the card alone would therefore stay green for a chart
 * that never drew, so scroll the card into view and assert the chart arm --
 * the `-chart` wrapper, which the placeholder never carries -- down to the
 * plot it contains. The wrapper alone would not do: a grouped-bar card
 * reserves its height on the wrapper, so a chart that rendered nothing would
 * leave a wrapper of the right size and an empty card.
 */
async function expectChartDrawn(page: Page, testId: string): Promise<void> {
    const card = page.getByTestId(testId);
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeVisible();
    const chart = page.getByTestId(`${testId}-chart`);
    await expect(chart).toBeVisible();
    // The card's help icon is in the header, outside this wrapper, so the only
    // SVG scoped to it is the plot itself.
    await expect(chart.locator("svg").first()).toBeVisible();
    await expect(page.getByTestId(`${testId}-placeholder`)).toHaveCount(0);
}
