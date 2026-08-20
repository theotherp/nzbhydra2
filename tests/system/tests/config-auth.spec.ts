import type {Page} from "@playwright/test";

import {dismissWelcomeDialog, expect, test, testEnvironment} from "./fixtures";
import {prepareVisualEvidence, visualEvidencePath} from "./visualEvidence";

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

/** The `/config/auth` document request itself also needs the key -- see `authorizeAsAdmin`. */
function authConfigUrl(): string {
    const redirect = `/config/auth?internalApiKey=${testEnvironment.hydraInternalApiKey}`;
    return `ui/react?redirect=${encodeURIComponent(redirect)}`;
}

async function openAuthConfig(page: Page): Promise<void> {
    await page.goto("ui/react?redirect=/config/auth");
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
    await expect(page.getByText("Configuration saved.")).toBeVisible();
}

test.describe("Config auth tab user management", () => {
    test("should add a user through the UI, persist it, and mask its password on reload", async ({
        page,
        hydra,
    }) => {
        const before = (await hydra.getConfig()) as Json;
        // A seed user makes the auth-type change (`NONE` -> `BASIC`) valid on
        // its own: `AuthConfigValidator` refuses to persist a non-`NONE` auth
        // type with no users and no access restriction enabled, and the UI's
        // Users section itself only ever renders for a non-`NONE` auth type.
        // Seeding both directly through the API keeps the browser-driven part
        // of this test focused on the add flow this task actually owns.
        const seeded = structuredClone(before);
        authSection(seeded).authType = "BASIC";
        authSection(seeded).restrictSearch = true;
        authSection(seeded).users = [
            {
                maySeeAdmin: true,
                maySeeDetailsDl: true,
                maySeeStats: true,
                password: "{noop}seed-password",
                showIndexerSelection: true,
                username: "seed-admin",
            },
        ];
        await hydra.saveConfig(seeded);

        await openAuthConfigAsAdmin(page);
        await expect(
            page.getByTestId("config-repeat-entry-auth-users-0"),
        ).toBeVisible();
        await expect(
            page.getByTestId("config-input-auth-users-0-password"),
        ).toHaveAttribute("placeholder", "Value unchanged");

        await page.getByTestId("config-repeat-add-auth-users").click();
        const newEntry = page.getByTestId("config-repeat-entry-auth-users-1");
        await expect(newEntry).toBeVisible();
        await newEntry
            .getByTestId("config-input-auth-users-1-username")
            .fill("new-user");
        await newEntry
            .getByTestId("config-input-auth-users-1-password")
            .fill("correct-horse-battery");

        await saveAndExpectSuccess(page);

        // The edits survive a full document load, which proves they were
        // persisted rather than only held in the form.
        await page.reload();
        await dismissWelcomeDialog(page);
        await expect(page.getByTestId("config-auth")).toBeVisible();
        await expect(
            page.getByTestId("config-repeat-entry-auth-users-1"),
        ).toBeVisible();
        await expect(
            page.getByTestId("config-input-auth-users-1-username"),
        ).toHaveValue("new-user");
        await expect(
            page.getByTestId("config-input-auth-users-1-password"),
        ).toHaveAttribute("placeholder", "Value unchanged");

        const after = (await hydra.getConfig()) as Json;
        expect(usersOf(after)).toHaveLength(2);
        expect(usersOf(after)[1]).toMatchObject({
            password: UNCHANGED_MARKER,
            username: "new-user",
        });
    });

    test("should rename an existing user without touching its password and keep both users' passwords intact", async ({
        page,
        hydra,
    }) => {
        const before = (await hydra.getConfig()) as Json;
        const seeded = structuredClone(before);
        authSection(seeded).authType = "BASIC";
        authSection(seeded).restrictSearch = true;
        // Two users, matching `SensitiveDataConfigValidator.
        // findCorrespondingOldItem`'s risk exactly: it matches an edited
        // `UserAuthConfig` back to its stored counterpart *positionally*
        // before `UserAuthConfigValidator` ever gets a chance to match it by
        // username (`BaseConfigValidator.prepareForSaving:137-149`), because
        // `UserAuthConfig` has no `name` field for the generic pass to use. A
        // second, untouched user at a different index is what would expose a
        // real mismatch if the positional fallback ever confused the two.
        authSection(seeded).users = [
            {
                maySeeAdmin: true,
                maySeeDetailsDl: true,
                maySeeStats: true,
                password: "{noop}rename-password",
                showIndexerSelection: true,
                username: "rename-me",
            },
            {
                maySeeAdmin: false,
                maySeeDetailsDl: true,
                maySeeStats: true,
                password: "{noop}bystander-password",
                showIndexerSelection: true,
                username: "bystander",
            },
        ];
        await hydra.saveConfig(seeded);

        await openAuthConfigAsAdmin(page);
        await expect(
            page.getByTestId("config-repeat-entry-auth-users-0"),
        ).toBeVisible();
        await expect(
            page.getByTestId("config-repeat-entry-auth-users-1"),
        ).toBeVisible();

        // Rename the first user; its password field is never touched, and
        // the second (`bystander`) user's row is never opened at all -- that
        // is the whole point of this test.
        await page
            .getByTestId("config-input-auth-users-0-username")
            .fill("renamed");
        await saveAndExpectSuccess(page);

        await page.reload();
        await dismissWelcomeDialog(page);
        await expect(page.getByTestId("config-auth")).toBeVisible();
        await expect(
            page.getByTestId("config-input-auth-users-0-username"),
        ).toHaveValue("renamed");
        await expect(
            page.getByTestId("config-input-auth-users-0-password"),
        ).toHaveAttribute("placeholder", "Value unchanged");
        await expect(
            page.getByTestId("config-input-auth-users-1-username"),
        ).toHaveValue("bystander");
        await expect(
            page.getByTestId("config-input-auth-users-1-password"),
        ).toHaveAttribute("placeholder", "Value unchanged");

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
                path: visualEvidencePath("F-CONFIG-AUTH", `auth-none-${viewport}`),
                fullPage: true,
            });

            await page.getByRole("combobox", {name: "Auth type"}).click();
            await page.getByRole("option", {name: "Login form"}).click();
            await expect(page.getByTestId("config-fieldset-users")).toBeVisible();
            await page.screenshot({
                path: visualEvidencePath("F-CONFIG-AUTH", `auth-form-${viewport}`),
                fullPage: true,
            });

            // Two Users-section entries, captured while auth type is still
            // `FORM` so both rows' password fields are visible too (they hide
            // for `OIDC`, captured separately below).
            await page.getByTestId("config-repeat-add-auth-users").click();
            await page.getByTestId("config-repeat-add-auth-users").click();
            await expect(
                page.getByTestId("config-repeat-entry-auth-users-1"),
            ).toBeVisible();
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-AUTH",
                    `auth-users-two-entries-${viewport}`,
                ),
                fullPage: true,
            });

            await page.getByRole("combobox", {name: "Auth type"}).click();
            await page.getByRole("option", {name: "OpenID Connect"}).click();
            await expect(
                page.getByTestId("config-fieldset-openid connect"),
            ).toBeVisible();
            await page.screenshot({
                path: visualEvidencePath("F-CONFIG-AUTH", `auth-oidc-${viewport}`),
                fullPage: true,
            });
        });
    }
});
