import {dismissWelcomeDialog, expect, test} from "./fixtures";
import {
    captureVisualRegion,
    expectVisualGeometry,
    prepareVisualEvidence,
    visualViewports,
} from "./visualEvidence";

test("should load the application shell", async ({page, hydra}) => {
    await page.goto("/");
    await dismissWelcomeDialog(page);

    await expect(page.locator("a[href=\"/\"]")).toBeVisible();
    await expect(page.locator("a[href=\"/config/main\"]")).toBeVisible();
    await expect.poll(() => hydra.getConfig().then(config => config.main)).toBeTruthy();
});

test.describe("Branded app shell visual evidence", () => {
    for (const viewport of Object.keys(
        visualViewports,
    ) as Array<keyof typeof visualViewports>) {
        test(`should render the branded AppBar without horizontal overflow at ${viewport}`, async ({
            page,
        }) => {
            await prepareVisualEvidence(page, viewport, async () => {
                await page.goto("/");
                await dismissWelcomeDialog(page);
                await page.goto("ui/react?redirect=/");
                await expect(page).toHaveURL(/\/$/);
                await expect(page.getByRole("banner")).toBeVisible();
            });

            const appBar = page.getByRole("banner");
            await expectVisualGeometry(page, {
                region: `app-bar-${viewport}`,
                locator: appBar,
            });
            await captureVisualRegion(
                appBar,
                "F-PLATFORM-SHELL",
                `app-bar-${viewport}`,
            );

            const logo = page.getByTestId("app-shell-logo");
            await expect(logo).toBeVisible();
            await expect(logo).toHaveAccessibleName("NZBHydra2");

            if (viewport === "desktop") {
                const nav = page.getByTestId("app-shell-nav");
                await expectVisualGeometry(page, {
                    region: "app-shell-nav-desktop",
                    locator: nav,
                });

                const navLinks = nav.getByRole("link");
                const linkCount = await navLinks.count();
                expect(linkCount).toBeGreaterThan(1);
                const boxes = await Promise.all(
                    Array.from({length: linkCount}, (_, index) =>
                        navLinks.nth(index).boundingBox(),
                    ),
                );
                const yPositions = boxes.map((box, index) => {
                    expect(
                        box,
                        `nav item ${index} must have a bounding box`,
                    ).not.toBeNull();
                    return box?.y ?? 0;
                });
                const [firstY, ...restY] = yPositions;
                for (const [index, y] of restY.entries()) {
                    expect(
                        Math.abs(y - firstY),
                        `nav item ${index + 1} must be horizontally aligned with the first nav item, not vertically stacked`,
                    ).toBeLessThanOrEqual(2);
                }

                // MUI's AppBar defaults `enableColorOnDark` to `false`, so the
                // AppBar itself does not render `primary`-colored under
                // `palette.mode: "dark"`. The real, genuine use of the
                // branded primary green as an interactive affordance is the
                // current route's own nav item (the default `/` route lands
                // on "Search", which is active here); assert its actual
                // rendered color in the real browser, not just its presence.
                const activeLink = nav.locator('[aria-current="page"]');
                await expect(activeLink).toHaveCount(1);
                await expect(activeLink).toHaveAccessibleName("Search");
                const borderBottomColor = await activeLink.evaluate(
                    (element) =>
                        window.getComputedStyle(element).borderBottomColor,
                );
                expect(borderBottomColor).toBe("rgb(15, 171, 75)");
            }
        });
    }
});
