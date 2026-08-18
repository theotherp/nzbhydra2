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

    await expect(page.locator('a[href="/"]')).toBeVisible();
    await expect(page.locator('a[href="/config/main"]')).toBeVisible();
    await expect
        .poll(() => hydra.getConfig().then((config) => config.main))
        .toBeTruthy();
});

test.describe("Branded app shell visual evidence", () => {
    for (const viewport of Object.keys(visualViewports) as Array<
        keyof typeof visualViewports
    >) {
        test(`should render the branded AppBar without horizontal overflow at ${viewport}`, async ({
            page,
        }) => {
            // Registered before the first navigation so it observes every
            // request the app makes while loading, not just post-load ones.
            const fontCdnRequests: string[] = [];
            page.on("request", (request) => {
                const host = new URL(request.url()).host;
                if (
                    host === "fonts.googleapis.com" ||
                    host === "fonts.gstatic.com"
                ) {
                    fontCdnRequests.push(request.url());
                }
            });

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

            // State `branded-typography-and-density` (ADR-0009). The three
            // claims below are exactly the ones a CSS-only inspection cannot
            // make: that the vendored webfont is really applied and really
            // loaded, that the mock's two-tone shell surface is really
            // rendered, and that none of it costs a third-party CDN request.
            const appBarFontFamily = await appBar.evaluate(
                (element) => window.getComputedStyle(element).fontFamily,
            );
            expect(appBarFontFamily).toContain("IBM Plex Sans");

            const loadedFontFamilies = await page.evaluate(() =>
                Array.from(document.fonts)
                    .filter((face) => face.status === "loaded")
                    .map((face) => face.family),
            );
            expect(
                loadedFontFamilies,
                "the vendored IBM Plex Sans webfont must actually load, not just be declared",
            ).toContain("IBM Plex Sans");

            const declaredFontFamilies = await page.evaluate(() =>
                Array.from(document.fonts).map((face) => face.family),
            );
            expect(
                declaredFontFamilies,
                "the vendored IBM Plex Mono webfont must be served by this application for feature code to apply",
            ).toContain("IBM Plex Mono");

            const [pageBackground, appBarBackground] = await Promise.all([
                page.evaluate(
                    () =>
                        window.getComputedStyle(document.body).backgroundColor,
                ),
                appBar.evaluate(
                    (element) =>
                        window.getComputedStyle(element).backgroundColor,
                ),
            ]);
            expect(
                appBarBackground,
                "the AppBar must render the theme's background.paper tone, distinct from the page's background.default",
            ).not.toBe(pageBackground);

            expect(
                fontCdnRequests,
                "fonts must be served from this application's own build output, never a runtime Google Fonts CDN",
            ).toEqual([]);

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
                // branded primary teal as an interactive affordance is the
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
                expect(borderBottomColor).toBe("oklch(0.75 0.1 190)");

                // Width-stability regression coverage (FM-035): selecting a
                // different destination must only toggle the previously
                // active item's border color, never resize its own box or
                // shift its neighbors sideways — this is what makes
                // navigating between nav items (now client-side via the
                // router) safe to exercise repeatedly. Capture "Search"'s
                // width while it is the active item (the default route),
                // click a different top-level destination, then assert
                // Search's own box width is unchanged now that it is
                // inactive.
                const searchLink = nav.getByRole("link", {name: "Search"});
                const searchWidthActive = (await searchLink.boundingBox())
                    ?.width;
                expect(
                    searchWidthActive,
                    "Search nav item must have a bounding box while active",
                ).not.toBeUndefined();

                const otherLink = navLinks
                    .filter({hasNotText: "Search"})
                    .first();
                await otherLink.click();
                await expect(searchLink).not.toHaveAttribute(
                    "aria-current",
                    "page",
                );

                const searchWidthInactive = (await searchLink.boundingBox())
                    ?.width;
                expect(
                    searchWidthInactive,
                    "Search nav item must have a bounding box while inactive",
                ).not.toBeUndefined();
                expect(
                    searchWidthInactive,
                    "Search nav item's box width must stay constant whether it is the active item or not",
                ).toBeCloseTo(searchWidthActive ?? 0, 0);
            }
        });
    }
});
