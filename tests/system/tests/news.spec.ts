import { expect, test } from "./fixtures";

const newsPayload = [
    {
        forCurrentVersion: true,
        forNewerVersion: false,
        news: '<p>First <a href="#safe-news">safe link</a></p><script>window.__unsafe = true</script>',
        version: "2.0.0",
    },
    {
        forCurrentVersion: false,
        forNewerVersion: true,
        news: "<p>Second</p>",
        version: "2.1.0",
    },
];

test("should render deterministic news in legacy and React shells without overflow", async ({
    page,
}, testInfo) => {
    const applicationBaseUrl = new URL(`${testInfo.project.use.baseURL}/`);
    const applicationUrl = (path: string) =>
        new URL(path, applicationBaseUrl).toString();

    await page.route("**/internalapi/news", async (route) => {
        await route.fulfill({
            contentType: "application/json",
            body: JSON.stringify(newsPayload),
        });
    });

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(applicationUrl("system/news"));
    await expect(
        page.getByRole("heading", { name: /2\.0\.0.*This version/ }),
    ).toBeVisible();
    await expect(
        page.getByRole("heading", { name: /2\.1\.0.*Newer version/ }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "safe link" })).toBeVisible();
    expect(
        await page
            .locator("html")
            .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);

    await page.goto(applicationUrl("ui/react?redirect=/system/news"));
    await expect(page).toHaveURL(/\/system\/news$/);
    await expect(
        page.getByRole("heading", { name: /2\.0\.0.*This version/ }),
    ).toBeVisible();
    await expect(
        page.getByRole("heading", { name: /2\.1\.0.*Newer version/ }),
    ).toBeVisible();
    expect(
        await page
            .locator("script")
            .evaluateAll((scripts) =>
                scripts.every(
                    (script) =>
                        !script.textContent?.includes("window.__unsafe = true"),
                ),
            ),
    ).toBe(true);
    expect(
        await page
            .locator("html")
            .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);

    await page.setViewportSize({ width: 390, height: 844 });
    expect(
        await page
            .locator("html")
            .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);

    const safeLink = page.getByRole("link", { name: "safe link" });
    await safeLink.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#safe-news$/);
});
