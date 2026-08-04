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

    const statsResponse = page.waitForResponse(response =>
        response.request().method() === "POST" && new URL(response.url()).pathname === "/internalapi/stats");
    await page.getByRole("link", {name: "History & Stats", exact: true}).click();
    await page.getByRole("tab", {name: "Stats", exact: true}).click();

    const requestBody = (await statsResponse).request().postDataJSON() as Record<string, unknown>;
    expect(typeof requestBody.includeDisabled).toBe("boolean");
    for (const statisticSwitch of statisticSwitches) {
        expect(typeof requestBody[statisticSwitch], statisticSwitch).toBe("boolean");
    }
});
