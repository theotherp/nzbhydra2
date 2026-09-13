import type {Page} from "@playwright/test";

import {dismissWelcomeDialog, expect, test} from "./fixtures";
import {
    prepareVisualEvidence,
    visualEvidencePath,
    type VisualViewport,
} from "./visualEvidence";

/**
 * FM-171 (`C-SESSION-EXPIRY`, issue #1080's client half).
 *
 * Issue #1080's server half (`60a121aae`) makes an expired session answer a
 * background `/internalapi/**` request with a plain 401. Reproducing that
 * against the shared instance would mean expiring a real session on it, which
 * every other spec in this suite runs against — so the 401 is injected at the
 * two data endpoints of one page instead, with `page.route`.
 *
 * The two endpoints are the System > Updates tab's own queries. Everything the
 * application needs to *start* is untouched: the document, its bundle, the
 * bootstrap `userinfos`, and the startup-check requests all answer normally,
 * so the page reaches the state a reader would be looking at when their
 * session lapses under them.
 *
 * `internalapi/updates/infos` is deliberately one of the two: the shell's
 * update-footer banner queries the same endpoint on the app-wide client, so
 * the refusal fails three react-query queries at once (two on the tab, one in
 * the shell) rather than one — which is exactly the concurrency the single
 * dialog has to survive.
 */

const REFUSED_ENDPOINTS = [
    "**/internalapi/updates/infos",
    "**/internalapi/updates/versionHistory",
];

async function refuseUpdateEndpoints(page: Page): Promise<string[]> {
    const refused: string[] = [];
    for (const pattern of REFUSED_ENDPOINTS) {
        await page.route(pattern, async (route) => {
            refused.push(new URL(route.request().url()).pathname);
            await route.fulfill({
                body: "Unauthorized",
                contentType: "text/plain",
                status: 401,
            });
        });
    }
    return refused;
}

/**
 * Reaches the Updates tab with the session-expired dialog raised, and with
 * nothing else on screen that could be mistaken for it.
 *
 * The startup sequence's welcome dialog is cleared on a *first* visit that
 * refuses nothing (`runStartupChecks` records `welcomeshown` server-side the
 * moment it shows the dialog, so the second visit cannot raise it again).
 * Dismissing it after the 401s would mean two stacked dialogs, whichever one
 * happened to win the backdrop.
 */
async function openUpdatesWithExpiredSession(page: Page): Promise<string[]> {
    await page.goto("/system/about");
    await dismissWelcomeDialog(page);
    await expect(page.getByTestId("system-shell")).toBeVisible();

    const refused = await refuseUpdateEndpoints(page);
    await page.goto("/system/updates");
    await expect(page.getByTestId("system-shell")).toBeVisible();
    return refused;
}

test.describe("Session expiry", () => {
    test("should raise one session-expired dialog with a reload action", async ({
        page,
    }) => {
        const refused = await openUpdatesWithExpiredSession(page);

        const dialog = page.getByTestId("session-expired-dialog");
        await expect(dialog).toBeVisible();
        // Exactly one, however many queries were refused. Counted on the
        // locator rather than trusting `toBeVisible`, which is satisfied by
        // the first match.
        await expect(dialog).toHaveCount(1);
        await expect(dialog).toContainText("Your session has expired");
        const reload = page.getByTestId("session-expired-reload");
        await expect(reload).toBeVisible();
        await expect(reload).toHaveText("Reload");

        // The premise of the "one dialog" claim: more than one request really
        // was refused. Exactly one request per consumer and no retry storm
        // behind them: the Updates tab asks for the infos and the version
        // history, and the shell's update footer (`UpdateFooterBanners`, its
        // own query key) asks for the infos again -- three requests, each
        // refused once, because `retryUnlessUnauthorized` stops react-query
        // from re-asking a question whose answer is 401. Asserted as the
        // exact multiset: a `>= 2` here once hid the third request, and a
        // plain count of two would have called the second consumer a retry.
        expect([...refused].sort()).toEqual([
            "/internalapi/updates/infos",
            "/internalapi/updates/infos",
            "/internalapi/updates/versionHistory",
        ]);
    });

    /*
     * README's *Visual Gate*: the reader has to be able to read this dialog
     * and find its action in both viewports, which is what the owner approves
     * by looking. The mobile capture is included because the dialog's own
     * width is viewport-relative.
     */
    for (const viewport of ["desktop", "mobile"] satisfies VisualViewport[]) {
        test(`should present the session-expired dialog on ${viewport}`, async ({
            page,
        }) => {
            await prepareVisualEvidence(page, viewport, async () => {
                await openUpdatesWithExpiredSession(page);
                await expect(
                    page.getByTestId("session-expired-dialog"),
                ).toBeVisible();
            });

            await page.screenshot({
                path: visualEvidencePath(
                    "F-PLATFORM-SHELL",
                    `session-expired-dialog-${viewport}`,
                ),
            });
        });
    }
});
