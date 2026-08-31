import {dismissWelcomeDialog, expect, searchForResult, test} from "./fixtures";
import {
    captureVisualRegion,
    expectVisualGeometry,
    prepareVisualEvidence,
    visualViewports,
} from "./visualEvidence";

// FM-094 flipped the served default to React and FM-095 removed the shell it
// was the default over, together with the `nzbhydra-ui` cookie and the two
// `/ui/...` selector endpoints that wrote and read it. So there is no
// longer a shell to state: every test in this suite navigates straight to a
// canonical route, and this file is where the served shell itself is asserted.
test("should load the application shell", async ({page, hydra}) => {
    await page.goto("/");
    await dismissWelcomeDialog(page);

    await expect(page.locator('a[href="/"]')).toBeVisible();
    await expect(page.locator('a[href="/config/main"]')).toBeVisible();
    await expect
        .poll(() => hydra.getConfig().then((config) => config.main))
        .toBeTruthy();
});

// FM-095: `shell-selector.spec.ts` is deleted with its subject -- the cookie
// selector -- but its surviving half is not about the selector at all: it is
// the claim that a browser carrying no cookie of ours is served the React
// shell, entry bundle and all, on the root and on a canonical deep link. That
// claim outlives the selector and moves here, where the served shell is
// already this file's subject.
test("should serve the React shell and its entry bundle to a cookie-less browser", async ({
    page,
}) => {
    // A context that has never contacted this application: nothing to clear,
    // and nothing in the HTTP cache, so waiting for the entry asset here (the
    // context's first load of it) cannot be satisfied from cache.
    expect(await page.context().cookies()).toEqual([]);

    const reactAsset = page.waitForResponse(
        (response) =>
            new URL(response.url()).pathname.endsWith(
                "/static/react/assets/index.js",
            ) && response.status() === 200,
    );
    await page.goto("/");
    await expect(page.getByTestId("app-shell-nav")).toBeVisible();
    await reactAsset;

    // The deep link lands on the route's real body. Asserting the migrated
    // body rather than a placeholder is what keeps this honest: it says
    // "React served this route", not "React has not implemented it yet".
    await page.goto("/system/tasks");
    await expect(page).toHaveURL(/\/system\/tasks$/);
    await expect(page.getByTestId("system-tasks-table")).toBeVisible();
});

// FM-095 deletes the legacy Thymeleaf templates, and `MainWeb`'s two logout
// mappings used to render one of them (`index`) -- FM-094's review carried
// that forward as the thing this packet must not leave behind. Unauthenticated
// instances like this one reach `MainWeb.logout` directly (with authentication
// configured Spring Security's own filter answers first), so the view it names
// has to resolve, and what has to come back is the React shell document.
test("should still answer the logout flow with the React shell document", async ({
    page,
}) => {
    const response = await page.request.post("logout");

    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('<div id="root">');
    // `react.html` emits the entry script relative to its `<base href>`, so
    // this is the same asset the browser resolves against the configured base.
    expect(body).toContain('src="static/react/assets/index.js"');
});

// FM-079: the startup sequence's announcements are all one-shot server state
// on this shared instance — showing the welcome dialog records it as shown,
// showing news acknowledges it, and every admin warning clears its stored flag.
// So the only thing asserted live is the quiet case: a session that has
// already seen the welcome opens the application without any dialog in the
// way. The sequence itself is proven by component tests with the transport
// mocked.
test("should open with no startup dialog once the welcome was shown", async ({
    page,
}) => {
    // FM-141: both preconditions this test used to arrange for itself are the
    // baseline's now. The downloader-status footer's gate is "at least one
    // enabled downloader" and `downloads.spec.ts`, `results.spec.ts` and
    // `config-downloading.spec.ts` all leave a `Deterministic SABnzbd`
    // behind -- `applyBaseline()` puts `downloading` back, so the assertion at
    // the end is about the not-showing case by construction rather than by a
    // hand-rolled save here. And the welcome is raised rather than skipped
    // over: this used to `test.skip` when the instance had not consumed that
    // one-shot state yet, which under the `systemtest` profile it never did,
    // because `application-systemtest.properties` sets
    // `nzbhydra.welcomeShown=true` and `WelcomeWeb` answers on that as well as
    // on the field. The skip was therefore unreachable and the field itself
    // was still `false`. Asserting it states the precondition instead of
    // stepping around it.
    const welcomeShown = await page.request.get("internalapi/welcomeshown");
    expect(welcomeShown.ok()).toBe(true);
    expect(
        (await welcomeShown.text()).trim(),
        "the baseline raises main.welcomeShown, so loading the page cannot consume that one-shot state here",
    ).toBe("true");

    // `FAILED_BACKUP` is the sequence's last check, so its response is the
    // point at which "no dialog" is a statement about the finished sequence
    // rather than about a race with it.
    const lastCheck = page.waitForResponse((response) =>
        new URL(response.url()).pathname.endsWith(
            "/internalapi/genericstorage/FAILED_BACKUP",
        ),
    );
    // FM-094: `/` serves React now, so this entry point no longer switches
    // shells -- it is kept because it states, at the point of navigation,
    // which shell the assertions below are about.
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
    await lastCheck;

    await expect(page.getByTestId("app-shell-nav")).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // FM-080: this shared instance is current, so neither the update banner
    // nor the automatic-update notice has anything to offer -- component
    // tests (`UpdateFooterBanners.test.tsx`) cover both variants, the
    // withdrawal rule, ignore, and dismiss-ack with the transport mocked.
    await expect(page.getByTestId("update-footer")).toHaveCount(0);
    await expect(page.getByTestId("automatic-update-footer")).toHaveCount(0);

    // FM-081: this shared instance has no downloader configured, so legacy's
    // own footer gate (the setting plus at least one enabled downloader) is
    // not satisfied and the React footer must not render either. Enabling a
    // downloader here would reconfigure the instance for every other spec, so
    // the showing states are covered by component tests
    // (`DownloaderStatusFooter.test.tsx`) with the STOMP layer mocked.
    await expect(page.getByTestId("downloader-status-footer")).toHaveCount(0);
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
                // FM-094: the preceding bare `page.goto("/")` existed only to
                // dismiss the welcome dialog before switching shells; with
                // React served by default that first navigation was a second
                // load of the same shell, so it is gone.
                await page.goto("/");
                await dismissWelcomeDialog(page);
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

            // FM-078: with no authentication configured legacy's header never
            // offered a login/logout affordance, and neither does this shell.
            // This instance is shared, so no system test switches
            // authentication on; the configured branches of the truth table
            // are proven by component tests instead.
            await expect(appBar.getByTestId("shell-loginout")).toHaveCount(0);

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

/*
 * FM-154 (ADR-0049): the nav-bar theme selector, and the Visual Gate strip for
 * the four themes it switches between.
 *
 * This lives beside the shell's other cases because the selector is a shell
 * affordance, and because the shell is the one surface every theme has to be
 * right on. The captures below are the strip the repository owner approves: the
 * search results and one config page in each theme, the grey pair first so that
 * "the default did not drift" is checkable side by side against the same pages
 * from before FM-154, plus the open selector on both viewports.
 */
test.describe("Theme selection", () => {
    const themes = [
        {label: "Grey", value: "grey"},
        {label: "Bright", value: "bright"},
        {label: "Dark", value: "dark"},
        {label: "Dark (Dyschromatopsia)", value: "dark-dyschromatopsia"},
    ] as const;

    async function chooseTheme(
        page: import("@playwright/test").Page,
        value: string,
    ): Promise<void> {
        await page.getByTestId("app-shell-theme-selector").click();
        await page.getByTestId(`app-shell-theme-option-${value}`).click();
        // Unmounted, not merely hidden. MUI keeps a closing `Menu` mounted and
        // fading for the length of its exit transition, and a capture taken in
        // that window photographs a translucent menu over the page -- which is
        // exactly what the first FM-154 strip caught.
        await expect(page.getByRole("menu")).toHaveCount(0);
    }

    /*
     * FM-155: the preference is stored per user now, so every test below
     * leaves a durable record behind on a shared instance -- which is exactly
     * what FM-124's restoration discipline is about. `themePreference` is
     * `THEME_PREFERENCE_KEY` (`core/ui-react/src/services/theme/
     * themePreference.ts`), written here in the same shape the application
     * writes it: a JSON string body, which `GenericStorageWeb.put` stores
     * JSON-encoded again.
     */
    const THEME_PREFERENCE_URL =
        "/internalapi/genericstorage/themePreference?forUser=true";
    const DEFAULT_THEME = "grey";

    async function storeThemePreference(
        page: import("@playwright/test").Page,
        preference: string,
    ): Promise<void> {
        const response = await page.request.put(THEME_PREFERENCE_URL, {
            data: JSON.stringify(preference),
            headers: {"content-type": "application/json"},
        });
        expect(response.ok()).toBe(true);
    }

    test.beforeEach(async ({hydra, page}) => {
        await hydra.configureMockIndexers(["1", "2"]);
        await page.request.put(
            "/internalapi/genericstorage/isGroupEpisodesHelpShown?forUser=true",
            {data: true},
        );
        await page.goto("/");
        await dismissWelcomeDialog(page);
        await expect(page.getByTestId("search-query")).toBeVisible();
    });

    // Every case here re-themes the instance for the user it runs as, and the
    // record outlives the browser context. Restored to the default so the next
    // spec -- and the next run -- starts from the palette every other visual
    // capture in this suite was taken in.
    test.afterEach(async ({page}) => {
        await storeThemePreference(page, DEFAULT_THEME);
    });

    test("should apply a chosen theme immediately, without a reload", async ({
        page,
    }) => {
        const selector = page.getByTestId("app-shell-theme-selector");
        await expect(selector).toHaveText("Theme: Grey");

        // The page ground is the honest evidence that a *theme* changed rather
        // than a label: it is painted by `CssBaseline` from
        // `palette.background.default`, which is a different value in all four.
        const ground = () =>
            page.evaluate(
                () => getComputedStyle(document.body).backgroundColor,
            );
        const grounds = new Map<string, string>();
        // A load counter that a full navigation would reset: "no reload" is
        // asserted, not assumed.
        await page.evaluate(() => {
            (window as unknown as {fm154: number}).fm154 = 1;
        });

        for (const theme of themes) {
            await chooseTheme(page, theme.value);
            await expect(selector).toHaveText(`Theme: ${theme.label}`);
            grounds.set(theme.value, await ground());
        }

        expect(
            await page.evaluate(
                () => (window as unknown as {fm154?: number}).fm154,
            ),
            "choosing a theme must not reload the document",
        ).toBe(1);
        // Each theme's own `background.default`, named rather than merely
        // counted: `dark` and `dark-dyschromatopsia` deliberately share a pure
        // black page (legacy's `@body-bg` for both), so a "four distinct
        // values" assertion would be wrong about the palettes rather than
        // about the switching. What each of the four *is* is the real claim --
        // and it covers the two a screenshot would not pin, that the light
        // theme is genuinely light and the near-black one genuinely
        // near-black.
        expect(Object.fromEntries(grounds)).toEqual({
            grey: "rgb(31, 36, 38)",
            bright: "rgb(242, 244, 243)",
            dark: "rgb(0, 0, 0)",
            "dark-dyschromatopsia": "rgb(0, 0, 0)",
        });
    });

    /*
     * FM-155 (ADR-0049): the whole point of the persistence half -- the choice
     * survives a reload, through the server record rather than through the
     * browser.
     *
     * The local seed cache is cleared before the reload deliberately: with it
     * in place this test would pass on a `localStorage` round trip alone and
     * say nothing about `API-PREFERENCES-GET/PUT`, which is the durable,
     * cross-browser half the ADR actually asked for.
     */
    test("should still apply a chosen theme after a reload, from the stored per-user preference", async ({
        page,
    }) => {
        const selector = page.getByTestId("app-shell-theme-selector");
        await expect(selector).toHaveText("Theme: Grey");

        const stored = page.waitForResponse(
            (response) =>
                response.request().method() === "PUT" &&
                new URL(response.url()).pathname ===
                    "/internalapi/genericstorage/themePreference",
        );
        await chooseTheme(page, "bright");
        expect((await stored).ok()).toBe(true);

        await page.evaluate(() => {
            localStorage.clear();
        });
        await page.reload();
        await dismissWelcomeDialog(page);

        await expect(selector).toHaveText("Theme: Bright");
        await expect
            .poll(() =>
                page.evaluate(
                    () => getComputedStyle(document.body).backgroundColor,
                ),
            )
            .toBe("rgb(242, 244, 243)");

        // The Visual Gate's second FM-155 item: the reloaded page, in the
        // theme the stored preference put it in.
        await prepareVisualEvidence(page, "desktop", async () => {
            await expect(page.getByTestId("search-query")).toBeVisible();
        });
        await captureVisualRegion(
            page.locator("body"),
            "F-PLATFORM-SHELL",
            "theme-persisted-after-reload-desktop",
        );
    });

    test("should keep the selector keyboard operable with a visible focus ring", async ({
        page,
    }) => {
        const selector = page.getByTestId("app-shell-theme-selector");
        await selector.focus();
        await expect(selector).toBeFocused();
        // ADR-0013's authored ring, which `MuiButton` carries; measured here
        // rather than in jsdom, which has no `:focus-visible` and no computed
        // outline at all (ADR-0004).
        await page.keyboard.press("Tab");
        await page.keyboard.press("Shift+Tab");
        expect(
            await selector.evaluate((element) => {
                const style = getComputedStyle(element);
                return {
                    style: style.outlineStyle,
                    width: style.outlineWidth,
                };
            }),
        ).toEqual({style: "solid", width: "3px"});

        await page.keyboard.press("Enter");
        const menu = page.getByRole("menu");
        await expect(menu).toBeVisible();
        await expect(
            menu.getByTestId("app-shell-theme-option-grey"),
        ).toHaveAttribute("aria-checked", "true");
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("Enter");
        await expect(menu).toBeHidden();
        await expect(selector).not.toHaveText("Theme: Grey");
    });

    test("should capture the Visual Gate strip for every theme", async ({
        page,
    }) => {
        await prepareVisualEvidence(page, "desktop", async () => {
            await searchForResult(page, "uitest", "indexer1-result1");
        });

        for (const theme of themes) {
            await chooseTheme(page, theme.value);
            await expect(
                page.getByTestId("app-shell-theme-selector"),
            ).toHaveText(`Theme: ${theme.label}`);
            await captureVisualRegion(
                page.locator("body"),
                "F-PLATFORM-SHELL",
                `theme-${theme.value}-results-desktop`,
            );
        }

        // Re-prepared after the navigation rather than assumed: the
        // reduced-motion style tag `prepareVisualEvidence` injects belongs to
        // the previous document, so without this the config captures are taken
        // while transitions are still running.
        await prepareVisualEvidence(page, "desktop", async () => {
            await page.goto("/config/searching");
            await expect(page.getByTestId("config-save")).toBeVisible();
        });
        for (const theme of themes) {
            await chooseTheme(page, theme.value);
            await captureVisualRegion(
                page.locator("body"),
                "F-PLATFORM-SHELL",
                `theme-${theme.value}-config-desktop`,
            );
        }

        await page.getByTestId("app-shell-theme-selector").click();
        await expect(page.getByRole("menu")).toBeVisible();
        await captureVisualRegion(
            page.locator("body"),
            "F-PLATFORM-SHELL",
            "theme-selector-open-desktop",
        );
        await page.keyboard.press("Escape");

        await prepareVisualEvidence(page, "mobile", async () => {
            await page.goto("/");
            await expect(page.getByTestId("search-query")).toBeVisible();
        });
        await page.getByTestId("app-shell-theme-selector").click();
        await expect(page.getByRole("menu")).toBeVisible();
        await captureVisualRegion(
            page.locator("body"),
            "F-PLATFORM-SHELL",
            "theme-selector-open-mobile",
        );
    });
});
