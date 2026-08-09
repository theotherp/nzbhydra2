import {expect, test} from "./fixtures";

test("should select the React shell for a canonical deep link and switch back to legacy", async ({page}, testInfo) => {
    const applicationBaseUrl = new URL(`${testInfo.project.use.baseURL}/`);
    const applicationUrl = (path: string) => new URL(path, applicationBaseUrl).toString();

    await page.goto(applicationUrl(""));
    await expect(page.locator("#wrap")).toBeVisible();

    const reactAsset = page.waitForResponse(response =>
        new URL(response.url()).pathname.endsWith("/static/react/assets/index.js") && response.status() === 200,
    );
    await page.goto(applicationUrl("ui/react?redirect=/stats/stats?period=day"));
    await expect(page).toHaveURL(/\/stats\/stats\?period=day$/);
    await expect(page.getByText("React migration placeholder")).toBeVisible();
    await reactAsset;

    await page.getByRole("link", {name: "Switch to legacy UI"}).click();
    await expect(page).toHaveURL(/\/stats\/stats\?period=day$/);
    await expect(page.locator("#wrap")).toBeVisible();
});
