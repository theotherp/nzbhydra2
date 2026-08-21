import type {Page} from "@playwright/test";

import {dismissWelcomeDialog, expect, test} from "./fixtures";
import {
    prepareVisualEvidence,
    visualEvidencePath,
    visualViewports,
} from "./visualEvidence";

const newsPayload = [
    {
        forCurrentVersion: true,
        forNewerVersion: false,
        news: "<p>System shell news body</p>",
        version: "2.0.0",
    },
];

/**
 * A hard stop in front of the two irreversible actions the Control tab
 * offers. No test here clicks them; this makes that a guarantee rather than a
 * convention, because a stray click would take the shared instance every other
 * system test runs against down with it.
 */
async function blockSystemControlEndpoints(page: Page): Promise<string[]> {
    const attempted: string[] = [];
    await page.route("**/internalapi/control/**", async (route) => {
        attempted.push(new URL(route.request().url()).pathname);
        await route.abort();
    });
    return attempted;
}

async function openSystem(page: Page, path = "control"): Promise<void> {
    await page.goto(`ui/react?redirect=/system/${path}`);
    await dismissWelcomeDialog(page);
    await expect(page.getByTestId("system-shell")).toBeVisible();
}

test.describe("System shell", () => {
    test("should reach every tab, keep News inside the shell, and show the placeholder for unmigrated tabs", async ({
        page,
    }) => {
        const attemptedControlCalls = await blockSystemControlEndpoints(page);
        await page.route("**/internalapi/news", async (route) => {
            await route.fulfill({
                body: JSON.stringify(newsPayload),
                contentType: "application/json",
            });
        });

        await openSystem(page);
        await expect(page).toHaveURL(/\/system\/control$/);
        await expect(page.getByTestId("system-control")).toBeVisible();
        for (const [testId, label] of [
            ["system-tab-control", "Control"],
            ["system-tab-updates", "Updates"],
            ["system-tab-log", "Log"],
            ["system-tab-tasks", "Tasks"],
            ["system-tab-backup", "Backup"],
            ["system-tab-bugreport", "Bugreport / Debug"],
            ["system-tab-news", "News"],
            ["system-tab-about", "About"],
        ]) {
            await expect(page.getByTestId(testId)).toHaveText(label);
        }
        for (const testId of [
            "system-restart",
            "system-shutdown",
            "system-reload-config",
        ]) {
            await expect(page.getByTestId(testId)).toBeEnabled();
        }

        // An unmigrated tab: the placeholder, but still inside the shell.
        await page.getByTestId("system-tab-backup").click();
        await expect(page).toHaveURL(/\/system\/backup$/);
        await expect(
            page.getByText("React migration placeholder"),
        ).toBeVisible();
        await expect(page.getByTestId("system-shell")).toBeVisible();

        // News keeps its URL and is now a tab of the shell.
        await page.getByTestId("system-tab-news").click();
        await expect(page).toHaveURL(/\/system\/news$/);
        await expect(
            page.getByRole("heading", {name: /2\.0\.0.*This version/}),
        ).toBeVisible();
        await expect(page.getByTestId("system-shell")).toBeVisible();

        // A deep link to a tab lands on that tab, not on Control.
        await page.goto("system/about");
        await expect(page.getByTestId("system-shell")).toBeVisible();
        await expect(
            page.getByText("React migration placeholder"),
        ).toBeVisible();

        expect(
            attemptedControlCalls,
            "a system test must never restart or shut the shared instance down",
        ).toEqual([]);
    });

    test("should fall through to the migration placeholder for a session that may not see the admin area", async ({
        page,
    }) => {
        const attemptedControlCalls = await blockSystemControlEndpoints(page);
        // The *server's* role protection is unchanged and covered by
        // `AuthorizationSystemTest`; what is pinned here is the client-side
        // rule, which reads the session bootstrap the document carries
        // (`react.html`). Rewriting that one value in the real response is
        // the only way to observe a restricted session without changing
        // `auth.authType`, which is `@RestartRequired` and would make every
        // admin page 403 for the rest of the run (see `config-auth.spec.ts`).
        await page.route(
            (url) => url.pathname.startsWith("/system"),
            async (route) => {
                if (route.request().resourceType() !== "document") {
                    await route.continue();
                    return;
                }
                const response = await route.fetch();
                const body = (await response.text()).replace(
                    /window\.__NZBHYDRA_BOOTSTRAP__ = (.*);/,
                    (_match, json: string) =>
                        `window.__NZBHYDRA_BOOTSTRAP__ = ${JSON.stringify({
                            ...(JSON.parse(json) as Record<string, unknown>),
                            adminRestricted: true,
                            authConfigured: true,
                            maySeeAdmin: false,
                            username: "restricted-user",
                        })};`,
                );
                await route.fulfill({
                    body,
                    contentType: "text/html",
                    status: response.status(),
                });
            },
        );

        // Selects the React shell for this context (the `ui/react` endpoint
        // sets the selector cookie and redirects to the deep link, whose
        // document the route above rewrites).
        await page.goto("ui/react?redirect=/system/control");

        for (const tab of [
            "control",
            "updates",
            "log",
            "tasks",
            "backup",
            "bugreport",
            "news",
            "about",
        ]) {
            await page.goto(`system/${tab}`);
            await expect(
                page.getByText("React migration placeholder"),
            ).toBeVisible();
            await expect(page.getByTestId("system-shell")).toHaveCount(0);
        }

        expect(attemptedControlCalls).toEqual([]);
    });

    test("should render the shell, an unmigrated tab, and News for the visual gate", async ({
        page,
    }) => {
        const attemptedControlCalls = await blockSystemControlEndpoints(page);
        await page.route("**/internalapi/news", async (route) => {
            await route.fulfill({
                body: JSON.stringify(newsPayload),
                contentType: "application/json",
            });
        });

        for (const viewport of ["desktop", "mobile"] as const) {
            await prepareVisualEvidence(page, viewport, async () => {
                await openSystem(page);
                await expect(page.getByTestId("system-control")).toBeVisible();
            });
            await page.screenshot({
                path: visualEvidencePath(
                    "F-SYSTEM-CONTROL",
                    `control-${viewport}`,
                ),
            });
            expect(
                await page
                    .locator("html")
                    .evaluate(
                        (element) => element.scrollWidth <= element.clientWidth,
                    ),
                `the shell must not overflow at ${visualViewports[viewport].width}px`,
            ).toBe(true);

            await page.getByTestId("system-tab-backup").click();
            await expect(
                page.getByText("React migration placeholder"),
            ).toBeVisible();
            await page.screenshot({
                path: visualEvidencePath(
                    "F-SYSTEM-SHELL",
                    `placeholder-tab-${viewport}`,
                ),
            });

            await page.getByTestId("system-tab-news").click();
            await expect(
                page.getByRole("heading", {name: /2\.0\.0.*This version/}),
            ).toBeVisible();
            await page.screenshot({
                path: visualEvidencePath("F-SYSTEM-NEWS", `news-${viewport}`),
            });
        }

        expect(attemptedControlCalls).toEqual([]);
    });
});
