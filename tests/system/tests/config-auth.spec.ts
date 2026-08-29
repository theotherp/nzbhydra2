import type {Page} from "@playwright/test";

import {dismissWelcomeDialog, expect, test, testEnvironment} from "./fixtures";
import {
    expectVisualGeometry,
    prepareVisualEvidence,
    visualEvidencePath,
    visualViewports,
} from "./visualEvidence";

const UNCHANGED_MARKER = "***UNCHANGED***";

type Json = Record<string, unknown>;

function authSection(config: Json): Json {
    return config.auth as Json;
}

function usersOf(config: Json): Json[] {
    return authSection(config).users as Json[];
}

/**
 * Authorizes every request this page makes as an admin via the same
 * `internalApiKey` backdoor `fixtures.ts`'s own `hydra` API helper already
 * uses for every one of its calls (`HeaderAuthenticationFilter`, checked
 * before any anonymous-role logic).
 *
 * This is *only* needed once a test moves `auth.authType` off `NONE`.
 * Discovered empirically, not from reading the security code: doing so does
 * not merely leave real login unavailable (`authType` is `@RestartRequired`
 * and the login mechanism itself is fixed at JVM boot) -- it also switches on
 * `HydraGlobalMethodSecurityConfiguration`'s `@Secured` enforcement for
 * `MainWeb`'s `/`, `/config/**`, `/system/**`, and `/stats/**` routes, which
 * *is* re-evaluated live on every request. Those routes need `ROLE_ADMIN`/
 * `ROLE_USER`, but the anonymous filter that would otherwise grant them
 * (`SecurityConfig.enableAnonymousAccessIfConfigured`) is wired into the
 * filter chain only when `authType` was already non-`NONE` at boot -- which
 * it never is for a freshly started system-test instance. The net effect: the
 * moment a config with a non-`NONE` `authType` is saved, every admin page,
 * including the config UI's own document request, starts returning 403 for
 * an anonymous session, with no way back short of a real restart. Because
 * `HeaderAuthenticationFilter`'s per-request authentication is not persisted
 * to the session (Spring Security 6's stateless-by-default
 * `SecurityContextHolderFilter`), the key has to be attached to *every*
 * request, not just the first.
 *
 * One route this cannot fix: `internalApiKey` only ever grants `ROLE_ADMIN`
 * (`HeaderAuthenticationFilter.doFilterInternal`), never `ROLE_USER`, so
 * `GET /internalapi/config/safe` (`@Secured({"ROLE_USER"})`) 403s regardless.
 * `C-CONFIG-FORM`'s post-save flow (ADR-0017) awaits that query's invalidation
 * before showing the "Configuration saved." toast, and it is not this task's
 * subject, so it is stubbed here rather than left to fail and retry into the
 * save flow's own timing.
 */
async function authorizeAsAdmin(page: Page): Promise<void> {
    await page.route("**/internalapi/**", async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === "/internalapi/config/safe") {
            await route.fulfill({
                body: "{}",
                contentType: "application/json",
                status: 200,
            });
            return;
        }
        if (!url.searchParams.has("internalApiKey")) {
            url.searchParams.set(
                "internalApiKey",
                testEnvironment.hydraInternalApiKey,
            );
        }
        await route.continue({url: url.toString()});
    });
}

/**
 * The `/config/auth` document request itself also needs the key -- see `authorizeAsAdmin`. Until FM-095
 * this went through the selector endpoint, which meant the key had to survive a URL-encoded `redirect`
 * parameter and a redirect hop; the deep link now carries it directly.
 */
function authConfigUrl(): string {
    return `/config/auth?internalApiKey=${testEnvironment.hydraInternalApiKey}`;
}

async function openAuthConfig(page: Page): Promise<void> {
    await page.goto("/config/auth");
    await dismissWelcomeDialog(page);
    await expect(page.getByTestId("config-shell")).toBeVisible();
    await expect(page.getByTestId("config-auth")).toBeVisible();
}

/** As `openAuthConfig`, but for a test whose `auth.authType` is not `NONE`. */
async function openAuthConfigAsAdmin(page: Page): Promise<void> {
    await authorizeAsAdmin(page);
    await page.goto(authConfigUrl());
    await dismissWelcomeDialog(page);
    await expect(page.getByTestId("config-shell")).toBeVisible();
    await expect(page.getByTestId("config-auth")).toBeVisible();
}

/**
 * Submits the form and waits for the success toast. Every save in this file
 * keeps `auth.authType` (and every other `@RestartRequired` field) exactly
 * what the test's own setup already persisted, so none of them trip
 * `restartNeeded` -- there is deliberately no restart-dialog handling here,
 * because a system test must never restart the shared instance it runs
 * against.
 */
async function saveAndExpectSuccess(page: Page): Promise<void> {
    const saved = page.waitForResponse(
        (response) =>
            response.request().method() === "PUT" &&
            new URL(response.url()).pathname === "/internalapi/config",
    );
    await page.getByTestId("config-save").click();
    const result = (await (await saved).json()) as {
        errorMessages?: string[];
        ok?: boolean;
        restartNeeded?: boolean;
    };
    expect(result.errorMessages ?? []).toEqual([]);
    expect(result.ok).toBe(true);
    expect(
        result.restartNeeded,
        "this test's own setup already persisted the auth type; a save made only through Users-section edits must not additionally ask for a restart",
    ).toBe(false);
    // Anchored to the most recent toast: FM-084 made toasts stack, so a second
    // save leaves two in the DOM and an unanchored locator trips strict mode.
    await expect(page.getByText("Configuration saved.").last()).toBeVisible();
}

/** Seeds `auth` with a non-`NONE` type and the given users, through the API. */
async function seedUsers(
    hydra: {
        getConfig: () => Promise<unknown>;
        saveConfig: (config: Json) => Promise<unknown>;
    },
    users: Json[],
): Promise<void> {
    const seeded = structuredClone((await hydra.getConfig()) as Json);
    // `AuthConfigValidator` refuses a non-`NONE` auth type with no users and
    // no restriction enabled, and the Users section only renders for a
    // non-`NONE` type. Seeding both through the API keeps the browser-driven
    // part of each test on the flow it actually owns.
    authSection(seeded).authType = "BASIC";
    authSection(seeded).restrictSearch = true;
    authSection(seeded).users = users;
    await hydra.saveConfig(seeded);
}

/**
 * A seed user. The password is a `{noop}` literal that the backend stores as
 * given and masks on every load, so no test ever types or reads a credential
 * that would be plausible anywhere else.
 */
function seedUser(username: string, overrides: Json = {}): Json {
    return {
        maySeeAdmin: true,
        maySeeDetailsDl: true,
        maySeeStats: true,
        password: `{noop}seed-${username}`,
        showIndexerSelection: true,
        username,
        ...overrides,
    };
}

/** Opens the dialog over the row at `index` and waits for it. */
async function openUserDialog(page: Page, index: number): Promise<void> {
    await page.getByTestId(`config-user-edit-${index}`).click();
    await expect(page.getByTestId("config-user-dialog")).toBeVisible();
}

async function submitUserDialog(page: Page): Promise<void> {
    await page.getByTestId("config-user-dialog-submit").click();
    await expect(page.getByTestId("config-user-dialog")).toBeHidden();
}

test.describe("Config auth users search anchor", () => {
    /**
     * The behaviour the missing anchor cost, asserted end to end rather than
     * as "the id exists in the DOM". `settingsIndex.ts` indexes the Users list
     * as one section pointing at `config-repeat-auth-users`; FM-105's table
     * dropped that id, so from FM-105 until 2026-08-26 picking an Auth Users
     * hit routed to the tab and then silently did nothing -- the anchor poll
     * ran out its two seconds and no highlight was ever painted. Nothing was
     * red, which is exactly why this walks the whole path: search from another
     * tab, pick the hit, and require the section to be scrolled to *and*
     * marked.
     */
    test("should scroll to and highlight the Users section when its settings-search hit is picked", async ({
        page,
        hydra,
    }) => {
        await seedUsers(hydra, [seedUser("searchable-admin")]);

        await authorizeAsAdmin(page);
        // Started from another tab, so the hit has to route as well as scroll.
        await page.goto(
            `/config/main?internalApiKey=${testEnvironment.hydraInternalApiKey}`,
        );
        await dismissWelcomeDialog(page);
        await expect(page.getByTestId("config-shell")).toBeVisible();

        await page.getByTestId("config-search").fill("users who may log in");
        await expect(page.getByRole("listbox")).toBeVisible();
        await page.getByTestId("config-search-option-auth-users").click();

        await expect(page).toHaveURL(/\/config\/auth(\?|$)/);
        const section = page.getByTestId("config-repeat-auth-users");
        // The highlight is asserted first because it is deliberately temporary
        // (2.2s), and it is the half that silently never happened: the mark is
        // a `boxShadow` painted by a scoped global rule keyed on this very test
        // id, so its presence proves the anchor was resolved rather than polled
        // to its deadline.
        await expect
            .poll(() =>
                section.evaluate(
                    (element) => getComputedStyle(element).boxShadow,
                ),
            )
            .not.toBe("none");
        await expect(section).toBeVisible();
        await expect(section).toBeInViewport();
        // The table the section holds came along, so what was scrolled to is
        // the list itself and not an empty wrapper.
        await expect(page.getByTestId("config-users-table")).toBeVisible();
    });
});

test.describe("Config auth tab user management", () => {
    test("should add a user through the dialog with the rights it was given, and mask its password on reload", async ({
        page,
        hydra,
    }) => {
        await seedUsers(hydra, [seedUser("seed-admin")]);

        await openAuthConfigAsAdmin(page);
        await expect(page.getByTestId("config-user-entry-0")).toBeVisible();
        await expect(page.getByTestId("config-user-username-0")).toHaveText(
            "seed-admin",
        );
        // The table states that a password exists and shows nothing of it.
        await expect(page.getByTestId("config-user-password-0")).toHaveText(
            "Set",
        );

        await page.getByTestId("config-users-add").click();
        await expect(page.getByTestId("config-user-dialog")).toBeVisible();
        await page
            .getByTestId("config-input-auth-userDraft-username")
            .fill("new-user");
        await page
            .getByTestId("config-input-auth-userDraft-password")
            .fill("correct-horse-battery");
        // Turn the new user from an admin into a limited one and drop one of
        // the three individual rights, so the row has something to show that
        // is neither "Admin" nor everything.
        await page.getByRole("switch", {name: "May see admin area"}).click();
        await page.getByRole("switch", {name: "May see stats"}).click();
        await submitUserDialog(page);

        await expect(page.getByTestId("config-user-username-1")).toHaveText(
            "new-user",
        );
        await expect(page.getByTestId("config-user-rights-1")).toHaveText(
            "Details & DLIndexer selection",
        );
        await expect(page.getByTestId("config-user-password-1")).toHaveText(
            "Set (unsaved)",
        );

        await saveAndExpectSuccess(page);

        // The edits survive a full document load, which proves they were
        // persisted rather than only held in the form.
        await page.reload();
        await dismissWelcomeDialog(page);
        await expect(page.getByTestId("config-auth")).toBeVisible();
        await expect(page.getByTestId("config-user-username-1")).toHaveText(
            "new-user",
        );
        await expect(page.getByTestId("config-user-password-1")).toHaveText(
            "Set",
        );

        const after = (await hydra.getConfig()) as Json;
        expect(usersOf(after)).toHaveLength(2);
        expect(usersOf(after)[1]).toMatchObject({
            maySeeAdmin: false,
            maySeeDetailsDl: true,
            maySeeStats: false,
            password: UNCHANGED_MARKER,
            showIndexerSelection: true,
            username: "new-user",
        });
    });

    test("should rename an existing user without touching its password and keep both users' passwords intact", async ({
        page,
        hydra,
    }) => {
        // Two users, matching what `SensitiveDataConfigValidator` has to get
        // right: a submitted `UserAuthConfig` is matched back to its stored
        // counterpart by username, and only falls back to the index while the
        // list length is unchanged. A second, untouched user at a different
        // index is what would expose a mismatch.
        await seedUsers(hydra, [
            seedUser("rename-me"),
            seedUser("bystander", {maySeeAdmin: false}),
        ]);

        await openAuthConfigAsAdmin(page);
        await expect(page.getByTestId("config-user-entry-1")).toBeVisible();

        // Rename the first user. Its password field is opened but never
        // typed into, and the second user's row is never opened at all --
        // that is the whole point of this test.
        await openUserDialog(page, 0);
        const password = page.getByTestId(
            "config-input-auth-userDraft-password",
        );
        await expect(password).toHaveValue("");
        await expect(password).toHaveAttribute(
            "placeholder",
            "Value unchanged",
        );
        await page
            .getByTestId("config-input-auth-userDraft-username")
            .fill("renamed");
        await submitUserDialog(page);
        await saveAndExpectSuccess(page);

        await page.reload();
        await dismissWelcomeDialog(page);
        await expect(page.getByTestId("config-auth")).toBeVisible();
        await expect(page.getByTestId("config-user-username-0")).toHaveText(
            "renamed",
        );
        await expect(page.getByTestId("config-user-username-1")).toHaveText(
            "bystander",
        );
        for (const index of [0, 1]) {
            await expect(
                page.getByTestId(`config-user-password-${index}`),
            ).toHaveText("Set");
        }

        const after = (await hydra.getConfig()) as Json;
        expect(usersOf(after)).toHaveLength(2);
        expect(usersOf(after)[0]).toMatchObject({
            password: UNCHANGED_MARKER,
            username: "renamed",
        });
        expect(usersOf(after)[1]).toMatchObject({
            password: UNCHANGED_MARKER,
            username: "bystander",
        });

        // A second, otherwise-untouched round trip is equally inert: the
        // marker resolves to a real, unchanged stored password every time it
        // is saved, not just once. (What this cannot prove without
        // restarting the shared instance -- which a system test must never
        // do, and which `authType` requires to take live effect -- is that a
        // Basic-auth challenge actually accepts the original credential; see
        // the handoff for the full reasoning.)
        await saveAndExpectSuccess(page);
        const afterSecondSave = (await hydra.getConfig()) as Json;
        expect(usersOf(afterSecondSave)[0]).toMatchObject({
            password: UNCHANGED_MARKER,
            username: "renamed",
        });
        expect(usersOf(afterSecondSave)[1]).toMatchObject({
            password: UNCHANGED_MARKER,
            username: "bystander",
        });
    });

    test("should delete a user out of the middle of the list after confirming, leaving the others' passwords resolvable", async ({
        page,
        hydra,
    }) => {
        // The exact shape of the defect FM-068 closed. Removing an entry
        // changes the list length, so the positional fallback is refused
        // outright and every remaining marker has to be resolved by username.
        // If it were not, this save would either fail with an unresolved
        // marker or move one user's hash onto another.
        await seedUsers(hydra, [
            seedUser("first"),
            seedUser("middle"),
            seedUser("last", {maySeeAdmin: false, maySeeStats: false}),
        ]);

        await openAuthConfigAsAdmin(page);
        await expect(page.getByTestId("config-user-entry-2")).toBeVisible();

        await page.getByTestId("config-user-delete-1").click();
        const confirmation = page.getByTestId("config-user-delete-confirm");
        await expect(confirmation).toContainText('Delete the user "middle"?');
        await confirmation.getByRole("button", {name: "Delete"}).click();
        await expect(confirmation).toBeHidden();

        await expect(page.getByTestId("config-user-username-1")).toHaveText(
            "last",
        );
        await expect(page.getByTestId("config-user-entry-2")).toBeHidden();
        // After a delete, focus is on the table rather than lost to the body.
        await expect(page.getByTestId("config-users-table")).toBeFocused();

        await saveAndExpectSuccess(page);

        const after = (await hydra.getConfig()) as Json;
        expect(usersOf(after)).toHaveLength(2);
        expect(usersOf(after)[0]).toMatchObject({
            password: UNCHANGED_MARKER,
            username: "first",
        });
        expect(usersOf(after)[1]).toMatchObject({
            maySeeAdmin: false,
            password: UNCHANGED_MARKER,
            username: "last",
        });

        await page.reload();
        await dismissWelcomeDialog(page);
        await expect(page.getByTestId("config-auth")).toBeVisible();
        await expect(page.getByTestId("config-user-username-1")).toHaveText(
            "last",
        );
        await expect(page.getByTestId("config-user-entry-2")).toBeHidden();
    });
});

test.describe("Config auth tab visual evidence", () => {
    for (const viewport of ["desktop", "mobile"] as const) {
        test(`should capture the Auth tab states at ${viewport}`, async ({
            page,
            hydra,
        }) => {
            await hydra.getConfig();

            await prepareVisualEvidence(page, viewport, async () => {
                await openAuthConfig(page);
            });
            await expect(
                page.getByRole("combobox", {name: "Auth type"}),
            ).toHaveText("None");
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-AUTH",
                    `auth-none-${viewport}`,
                ),
                fullPage: true,
            });

            await page.getByRole("combobox", {name: "Auth type"}).click();
            await page.getByRole("option", {name: "Login form"}).click();
            await expect(
                page.getByTestId("config-fieldset-users"),
            ).toBeVisible();
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-AUTH",
                    `auth-form-${viewport}`,
                ),
                fullPage: true,
            });

            await page.getByRole("combobox", {name: "Auth type"}).click();
            await page.getByRole("option", {name: "OpenID Connect"}).click();
            await expect(
                page.getByTestId("config-fieldset-openid connect"),
            ).toBeVisible();
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-AUTH",
                    `auth-oidc-${viewport}`,
                ),
                fullPage: true,
            });
        });

        // FM-105's visual gate: the Users table with an admin and a limited
        // user, and the dialog that edits one. Both users are seeded through
        // the API with `{noop}` literals and the dialog's password field is
        // never typed into, so no capture in this file ever contains a
        // password a reader could mistake for a real one.
        test(`should capture the Users table and its dialog at ${viewport}`, async ({
            page,
            hydra,
        }) => {
            await seedUsers(hydra, [
                seedUser("admin-user"),
                seedUser("limited-user", {
                    maySeeAdmin: false,
                    maySeeStats: false,
                }),
            ]);

            await prepareVisualEvidence(page, viewport, async () => {
                await openAuthConfigAsAdmin(page);
            });
            await expect(page.getByTestId("config-user-entry-1")).toBeVisible();
            // Pinning a regression this task actually had: a four-column
            // layout put Edit and Delete off-canvas at 390px behind a
            // scrollbar with no affordance. The table must fit the width it
            // is given, and the row's controls must sit inside the viewport.
            await expectVisualGeometry(page, {
                region: `auth-users-table-${viewport}`,
                locator: page.getByTestId("config-users-table"),
            });
            const deleteBox = await page
                .getByTestId("config-user-delete-1")
                .boundingBox();
            expect(deleteBox).not.toBeNull();
            expect(
                (deleteBox?.x ?? 0) + (deleteBox?.width ?? 0),
                "the row's Delete must be inside the viewport, not behind a scroll",
            ).toBeLessThanOrEqual(visualViewports[viewport].width);
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-AUTH",
                    `auth-users-table-${viewport}`,
                ),
                fullPage: true,
            });

            await openUserDialog(page, 1);
            await expect(
                page.getByTestId("config-input-auth-userDraft-password"),
            ).toHaveAttribute("placeholder", "Value unchanged");
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-AUTH",
                    `auth-user-dialog-${viewport}`,
                ),
                fullPage: true,
            });
        });
    }

    // FM-068's visual gate. Desktop only: the save changes what the password
    // control holds, not how the tab is laid out.
    test("should capture the Auth tab immediately after a successful save at desktop", async ({
        page,
        hydra,
    }) => {
        await seedUsers(hydra, [seedUser("saved-user")]);

        await prepareVisualEvidence(page, "desktop", async () => {
            await openAuthConfigAsAdmin(page);
        });
        await openUserDialog(page, 0);
        await page
            .getByTestId("config-input-auth-userDraft-username")
            .fill("saved-user-renamed");
        await submitUserDialog(page);
        await saveAndExpectSuccess(page);

        // Immediately after the save and before any reload: the password the
        // response reset the form with is the marker again, so the row is back
        // to reporting a stored password it has no value for. Re-opening the
        // dialog shows the same thing from the control's side -- an empty field
        // with the unchanged placeholder, and a reveal button with nothing to
        // disclose.
        await expect(page.getByTestId("config-user-password-0")).toHaveText(
            "Set",
        );
        expect(usersOf((await hydra.getConfig()) as Json)[0]).toMatchObject({
            password: UNCHANGED_MARKER,
            username: "saved-user-renamed",
        });
        await page.screenshot({
            path: visualEvidencePath(
                "F-CONFIG-AUTH",
                "auth-after-save-desktop",
            ),
            fullPage: true,
        });
    });
});
