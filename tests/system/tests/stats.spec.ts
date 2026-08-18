import {dismissWelcomeDialog, expect, test} from "./fixtures";

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
    await expect(page.getByRole("alert")).toContainText("malformed");

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
