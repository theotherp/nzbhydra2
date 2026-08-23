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
// one, and React makes it too. So it is kept and its bare `page.goto("/")`,
// which reached the legacy shell before the default flip and would now reach
// React silently, is repointed at `ui/react?redirect=/` so the test states
// which shell it runs against. Every assertion is unchanged.
test("should send a complete stats request", async ({page}) => {
    await page.goto("ui/react?redirect=/");
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
    await page.goto(applicationUrl("ui/react?redirect=/stats"));
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
        await page.goto(applicationUrl("ui/react?redirect=/stats/stats"));
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
        await page.goto(applicationUrl("ui/react?redirect=/stats/stats"));
        await expect(
            page.getByTestId("stats-chart-response-times"),
        ).toBeVisible();
        await expect(
            page.getByTestId("stats-chart-indexer-download-shares"),
        ).toBeVisible();

        await page.getByTestId("stats-family-menu-button").click();
        await page.getByTestId("stats-family-avgResponseTimes").click();
        await page.keyboard.press("Escape");
        await expect(
            page.getByTestId("stats-chart-response-times"),
        ).toHaveCount(0);
        // The other family's chart survives the deselect.
        await expect(
            page.getByTestId("stats-chart-indexer-download-shares"),
        ).toBeVisible();

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
        await expect(
            page.getByTestId("stats-chart-response-times"),
        ).toBeVisible();
        // Re-enabling one family did not discard the previously held one.
        await expect(
            page.getByTestId("stats-chart-indexer-download-shares"),
        ).toBeVisible();
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
        await page.goto(applicationUrl("ui/react?redirect=/stats/stats"));
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
                await page.goto(
                    applicationUrl("ui/react?redirect=/stats/stats"),
                );
                await dismissWelcomeDialog(page);
                await expect(page.getByTestId("stats-dashboard")).toBeVisible();
                await expect(
                    page.getByTestId("stats-overview-tiles"),
                ).toBeVisible();
            });
            await page.screenshot({
                path: visualEvidencePath(
                    "F-STATS-MAIN",
                    `dashboard-${viewport}`,
                ),
                fullPage: true,
            });
        }
    });
});
