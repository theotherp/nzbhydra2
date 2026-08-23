import type {Page} from "@playwright/test";

import {dismissWelcomeDialog, expect, test} from "./fixtures";
import {prepareVisualEvidence, visualEvidencePath} from "./visualEvidence";

const UNCHANGED_MARKER = "***UNCHANGED***";

type Json = Record<string, unknown>;

async function openMainConfig(page: Page): Promise<void> {
    await page.goto("/config/main");
    await dismissWelcomeDialog(page);
    await expect(page.getByTestId("config-shell")).toBeVisible();
    await expect(page.getByTestId("config-main")).toBeVisible();
}

async function setAdvanced(page: Page, shown: boolean): Promise<void> {
    const toggle = page.getByRole("switch", {name: "Advanced settings"});
    await toggle.setChecked(shown);
    await expect(toggle).toBeChecked({checked: shown});
}

/**
 * The only difference a save may show in a section nobody edited: the backend
 * re-masks `@HiddenInUI` values on every read
 * (`SensitiveDataConfigValidator.prepareForDisplay`).
 */
function allowReMaskedSecrets(after: unknown, before: unknown): unknown {
    if (after === UNCHANGED_MARKER && typeof before === "string") {
        return before;
    }
    if (Array.isArray(after) && Array.isArray(before)) {
        return after.map((value, index) =>
            allowReMaskedSecrets(value, before[index]),
        );
    }
    if (
        after !== null &&
        before !== null &&
        typeof after === "object" &&
        typeof before === "object" &&
        !Array.isArray(after) &&
        !Array.isArray(before)
    ) {
        return Object.fromEntries(
            Object.entries(after as Json).map(([key, value]) => [
                key,
                allowReMaskedSecrets(value, (before as Json)[key]),
            ]),
        );
    }
    return after;
}

function mainSection(config: Json): Json {
    return config.main as Json;
}

function loggingSection(config: Json): Json {
    return mainSection(config).logging as Json;
}

test.describe("Config main tab round trip", () => {
    test("should save an edited plain and advanced field and change nothing else", async ({
        page,
        hydra,
    }) => {
        const before = (await hydra.getConfig()) as Json;
        // A plain (non-advanced) switch and an advanced number that lives in
        // the Logging fieldset, i.e. under `main.logging.*` — the one place on
        // this tab where the form path is not `main.<key>`.
        const proxyImagesBefore = mainSection(before).proxyImages === true;
        const logMaxHistoryBefore = Number(
            loggingSection(before).logMaxHistory,
        );
        const expectedLogMaxHistory = logMaxHistoryBefore === 21 ? 22 : 21;

        await openMainConfig(page);

        await setAdvanced(page, false);
        const proxyImages = page
            .getByTestId("config-setting-main-proxyImages")
            .getByRole("switch");
        await expect(proxyImages).toBeChecked({checked: proxyImagesBefore});
        await proxyImages.setChecked(!proxyImagesBefore);

        await setAdvanced(page, true);
        const logMaxHistory = page.getByTestId(
            "config-input-main-logging-logMaxHistory",
        );
        await expect(logMaxHistory).toHaveValue(String(logMaxHistoryBefore));
        await logMaxHistory.fill(String(expectedLogMaxHistory));

        const saved = page.waitForResponse(
            (response) =>
                response.request().method() === "PUT" &&
                new URL(response.url()).pathname === "/internalapi/config",
        );
        await page.getByTestId("config-save").click();
        const result = (await (await saved).json()) as {
            errorMessages?: string[];
            ok?: boolean;
        };
        expect(result.errorMessages ?? []).toEqual([]);
        expect(result.ok).toBe(true);
        // Anchored to the most recent toast: FM-084 made toasts stack, so a second
        // save leaves two in the DOM and an unanchored locator trips strict mode.
        await expect(
            page.getByText("Configuration saved.").last(),
        ).toBeVisible();

        // The edits survive a full document load, which proves they were
        // persisted rather than only held in the form.
        await page.reload();
        await dismissWelcomeDialog(page);
        await expect(page.getByTestId("config-main")).toBeVisible();
        await setAdvanced(page, true);
        await expect(
            page
                .getByTestId("config-setting-main-proxyImages")
                .getByRole("switch"),
        ).toBeChecked({checked: !proxyImagesBefore});
        await expect(
            page.getByTestId("config-input-main-logging-logMaxHistory"),
        ).toHaveValue(String(expectedLogMaxHistory));

        // Nothing but the two edited values moved: every other key of every
        // section — including the ones this UI does not model at all — is byte
        // for byte what it was before the save.
        const expected = structuredClone(before);
        mainSection(expected).proxyImages = !proxyImagesBefore;
        loggingSection(expected).logMaxHistory = expectedLogMaxHistory;
        const after = (await hydra.getConfig()) as Json;
        expect(allowReMaskedSecrets(after, expected)).toEqual(expected);
    });

    test("should block the save on an invalid field and leave the config untouched", async ({
        page,
        hydra,
    }) => {
        const before = await hydra.getConfig();
        await openMainConfig(page);

        const puts: string[] = [];
        page.on("request", (request) => {
            if (
                request.method() === "PUT" &&
                new URL(request.url()).pathname === "/internalapi/config"
            ) {
                puts.push(request.url());
            }
        });

        await page.getByTestId("config-input-main-host").fill("not-an-ip");
        await page.getByTestId("config-save").click();

        await expect(page.getByTestId("config-error-main-host")).toHaveText(
            "not-an-ip is not a valid IP Address",
        );
        await expect(
            page.getByText("Config invalid. Please check your settings."),
        ).toBeVisible();
        expect(puts, "an invalid form must not be submitted").toEqual([]);
        expect(await hydra.getConfig()).toEqual(before);
    });
});

test.describe("Config main tab visual evidence", () => {
    for (const viewport of ["desktop", "mobile"] as const) {
        test(`should capture the Main tab states at ${viewport}`, async ({
            page,
            hydra,
        }) => {
            await hydra.getConfig();

            await prepareVisualEvidence(page, viewport, async () => {
                await openMainConfig(page);
                await setAdvanced(page, false);
            });
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-MAIN",
                    `main-advanced-hidden-${viewport}`,
                ),
                fullPage: true,
            });

            await setAdvanced(page, true);
            await expect(
                page.getByTestId("config-fieldset-logging"),
            ).toBeVisible();
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-MAIN",
                    `main-advanced-shown-${viewport}`,
                ),
                fullPage: true,
            });

            // Captured before the validation state, so the invalid-form toast
            // does not sit on top of the dialog's own buttons.
            await page
                .getByTestId("config-file-browse-main-backupFolder")
                .click();
            const browser = page.getByTestId("config-file-browser-dialog");
            await expect(browser).toBeVisible();
            await expect(
                browser.getByTestId("config-file-browser-path"),
            ).not.toBeEmpty();
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-MAIN",
                    `main-folder-browser-${viewport}`,
                ),
            });
            await browser.getByRole("button", {name: "Cancel"}).click();
            await expect(browser).toBeHidden();

            const host = page.getByTestId("config-input-main-host");
            await host.fill("not-an-ip");
            await page.getByTestId("config-save").click();
            await expect(page.getByTestId("config-error-main-host")).toHaveText(
                "not-an-ip is not a valid IP Address",
            );
            await host.scrollIntoViewIfNeeded();
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-MAIN",
                    `main-validation-error-${viewport}`,
                ),
            });
        });
    }

    // FM-068's visual gate. Desktop only: the save changes what the secret
    // controls hold, not how the tab is laid out.
    test("should capture the Main tab immediately after a successful save at desktop", async ({
        page,
        hydra,
    }) => {
        const before = (await hydra.getConfig()) as Json;
        const seeded = structuredClone(before);
        mainSection(seeded).proxyType = "SOCKS";
        mainSection(seeded).proxyHost = "127.0.0.1";
        mainSection(seeded).proxyPort = 1080;
        mainSection(seeded).proxyUsername = "proxy-user";
        mainSection(seeded).proxyPassword = "proxy-password";
        await hydra.saveConfig(seeded);
        const proxyImagesBefore = mainSection(before).proxyImages === true;

        await prepareVisualEvidence(page, "desktop", async () => {
            await openMainConfig(page);
            await setAdvanced(page, true);
        });
        await expect(
            page.getByTestId("config-input-main-proxyUsername"),
        ).toHaveAttribute("placeholder", "Value unchanged");
        await page
            .getByTestId("config-setting-main-proxyImages")
            .getByRole("switch")
            .setChecked(!proxyImagesBefore);

        const saved = page.waitForResponse(
            (response) =>
                response.request().method() === "PUT" &&
                new URL(response.url()).pathname === "/internalapi/config",
        );
        await page.getByTestId("config-save").click();
        const result = (await (await saved).json()) as {
            errorMessages?: string[];
            newConfig?: Json;
            ok?: boolean;
        };
        expect(result.errorMessages ?? []).toEqual([]);
        expect(result.ok).toBe(true);
        // The save response is masked exactly like a load, so the form the
        // response resets holds the marker and not the stored credential.
        expect(mainSection(result.newConfig as Json).proxyUsername).toBe(
            UNCHANGED_MARKER,
        );
        expect(mainSection(result.newConfig as Json).proxyPassword).toBe(
            UNCHANGED_MARKER,
        );
        // Anchored to the most recent toast: FM-084 made toasts stack, so a second
        // save leaves two in the DOM and an unanchored locator trips strict mode.
        await expect(
            page.getByText("Configuration saved.").last(),
        ).toBeVisible();

        // Immediately after the save and before any reload: the proxy
        // credentials are back to their "Value unchanged" placeholder, so the
        // reveal button has nothing to disclose.
        await expect(
            page.getByTestId("config-input-main-proxyUsername"),
        ).toHaveValue("");
        await expect(
            page.getByTestId("config-input-main-proxyUsername"),
        ).toHaveAttribute("placeholder", "Value unchanged");
        await expect(
            page.getByTestId("config-input-main-proxyPassword"),
        ).toHaveValue("");
        await page
            .getByTestId("config-setting-main-proxyUsername")
            .scrollIntoViewIfNeeded();
        await page.screenshot({
            path: visualEvidencePath(
                "F-CONFIG-MAIN",
                "main-after-save-desktop",
            ),
            fullPage: true,
        });
    });
});
