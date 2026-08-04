import {dismissWelcomeDialog, expect, test} from "./fixtures";

test("should load the application shell", async ({page, hydra}) => {
    await page.goto("/");
    await dismissWelcomeDialog(page);

    await expect(page.locator("a[href=\"/\"]")).toBeVisible();
    await expect(page.locator("a[href=\"/config/main\"]")).toBeVisible();
    await expect.poll(() => hydra.getConfig().then(config => config.main)).toBeTruthy();
});
