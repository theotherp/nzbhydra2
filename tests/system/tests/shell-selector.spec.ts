import {expect, test} from "./fixtures";

// This file covers the cookie-based UI selector (`ui/react`, `ui/legacy`) that
// ADR-0001 introduced as a temporary switch. It used to be one test that
// deep-linked at whichever route was still unmigrated, asserted the migration
// placeholder there, and clicked the placeholder's "Switch to legacy UI" link
// to get back. That shape went stale twice as the migration advanced -- FM-024
// took `/stats/stats?period=day` (repointed 2026-08-21 to `/system/tasks`) and
// FM-077 then took `/system/tasks` too, leaving the file red since that commit:
// it asserted the real Tasks body and then clicked a link that only
// `MigrationPlaceholder` renders.
//
// It cannot be repointed a third time -- every canonical route is migrated now,
// which is itself the point. So the two things it conflated are separated here:
// selecting a shell is exercised through the selector endpoints themselves,
// which is the actual contract and cannot go stale as routes migrate, and the
// placeholder's own affordance is exercised where the placeholder still lives.
test.describe("UI shell selector", () => {
    const urls = (baseURL: string | undefined) => {
        const base = new URL(`${baseURL}/`);
        return (path: string) => new URL(path, base).toString();
    };

    test("should serve the React shell for a canonical deep link", async ({
        page,
    }, testInfo) => {
        const url = urls(testInfo.project.use.baseURL);

        await page.goto(url(""));
        await expect(page.locator("#wrap")).toBeVisible();

        const reactAsset = page.waitForResponse(
            (response) =>
                new URL(response.url()).pathname.endsWith(
                    "/static/react/assets/index.js",
                ) && response.status() === 200,
        );
        await page.goto(url("ui/react?redirect=/system/tasks"));
        await expect(page).toHaveURL(/\/system\/tasks$/);
        // The deep link lands on the route's real body. Asserting the migrated
        // body rather than a placeholder is what keeps this test honest as
        // further routes migrate: it says "React served this route", not
        // "React has not implemented this route yet".
        await expect(page.getByTestId("system-tasks-table")).toBeVisible();
        await reactAsset;
    });

    test("should switch back to the legacy shell and keep the deep link", async ({
        page,
    }, testInfo) => {
        const url = urls(testInfo.project.use.baseURL);

        await page.goto(url("ui/react?redirect=/system/tasks"));
        await expect(page.getByTestId("system-tasks-table")).toBeVisible();

        // The return trip goes through the `ui/legacy` endpoint, which is the
        // selector's actual contract. The placeholder's "Switch to legacy UI"
        // link is one affordance onto this endpoint, not the mechanism itself,
        // and it is covered separately below.
        await page.goto(url("ui/legacy?redirect=/system/tasks"));
        await expect(page).toHaveURL(/\/system\/tasks$/);
        await expect(page.locator("#wrap")).toBeVisible();
    });

    test("should offer a legacy switch from the migration placeholder", async ({
        page,
    }, testInfo) => {
        const url = urls(testInfo.project.use.baseURL);

        // Every canonical route is migrated, so the placeholder now survives
        // only on routes that do not resolve to a real body -- here an unknown
        // `stats/$tab`, whose component renders `MigrationPlaceholder` inside
        // the stats shell (`router.tsx`). Exercising it here keeps the link
        // covered rather than dropping the assertion along with the route that
        // used to host it. A path matching no route at all is deliberately not
        // used: it renders an empty document rather than the placeholder, so it
        // would assert nothing.
        await page.goto(url("ui/react?redirect=/stats/nope"));
        await expect(
            page.getByRole("link", {name: "Switch to legacy UI"}),
        ).toBeVisible();

        await page.getByRole("link", {name: "Switch to legacy UI"}).click();
        await expect(page.locator("#wrap")).toBeVisible();
    });
});
