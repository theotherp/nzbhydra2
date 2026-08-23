import type {Page} from "@playwright/test";

import {dismissWelcomeDialog, expect, test} from "./fixtures";
import {prepareVisualEvidence, visualEvidencePath} from "./visualEvidence";

const UNCHANGED_MARKER = "***UNCHANGED***";

type Json = Record<string, unknown>;

async function openConfig(page: Page): Promise<void> {
    await page.goto("ui/react?redirect=/config/main");
    await dismissWelcomeDialog(page);
    await expect(page.getByTestId("config-shell")).toBeVisible();
    await expect(page.getByTestId("config-save")).toBeVisible();
}

/**
 * The only difference a load-save-load round trip may show: the backend
 * re-masks `@HiddenInUI` values on every read
 * (`SensitiveDataConfigValidator.prepareForDisplay`), so a value that was
 * readable before can come back as the unchanged marker. Every other
 * difference — a dropped section, a coerced type, a lost key — survives this
 * substitution and fails the comparison.
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

test.describe("Config shell round trip", () => {
    test("should save an unedited config without changing it and without reloading the page", async ({
        page,
        hydra,
    }) => {
        const before = await hydra.getConfig();

        const documentLoads: string[] = [];
        page.on("load", (frame) => documentLoads.push(frame.url()));

        const savedResponse = page.waitForResponse(
            (response) =>
                response.request().method() === "PUT" &&
                new URL(response.url()).pathname === "/internalapi/config",
        );
        await openConfig(page);
        const loadsBeforeSave = documentLoads.length;
        // A marker that only survives while the very same document does.
        await page.evaluate(() => {
            (window as unknown as {__fm058?: boolean}).__fm058 = true;
        });

        await page.getByTestId("config-save").click();

        const response = await savedResponse;
        expect(response.status()).toBe(200);
        const result = (await response.json()) as {
            ok?: boolean;
            errorMessages?: string[];
            newConfig?: Json;
        };
        expect(
            result.errorMessages ?? [],
            "an unedited config must not produce validation errors",
        ).toEqual([]);
        expect(result.ok).toBe(true);
        expect(result.newConfig).toBeTruthy();

        // The UI PUT the complete configuration it had loaded — the whole
        // file is replaced on every save, so anything the envelope dropped
        // would be deleted here.
        expect(
            allowReMaskedSecrets(response.request().postDataJSON(), before),
        ).toEqual(before);

        // Anchored to the most recent toast: FM-084 made toasts stack, so a second
        // save leaves two in the DOM and an unanchored locator trips strict mode.
        await expect(
            page.getByText("Configuration saved.").last(),
        ).toBeVisible();

        // ADR-0017: no `window.location.reload()`, so the document that was
        // loaded before the save is still the one on screen.
        expect(
            await page.evaluate(
                () => (window as unknown as {__fm058?: boolean}).__fm058,
            ),
            "a successful save must not reload the document",
        ).toBe(true);
        expect(
            documentLoads.length,
            `a successful save must not load a new document (loads: ${documentLoads.join(", ")})`,
        ).toBe(loadsBeforeSave);

        const after = await hydra.getConfig();
        expect(allowReMaskedSecrets(after, before)).toEqual(before);
    });

    test("should reach every canonical tab and keep the config loaded", async ({
        page,
        hydra,
    }) => {
        await hydra.getConfig();
        await openConfig(page);

        for (const [segment, label] of [
            ["auth", "Authorization"],
            ["searching", "Searching"],
            ["categories", "Categories"],
            ["downloading", "Downloading"],
            ["externalTools", "External Tools"],
            ["indexers", "Indexers"],
            ["notifications", "Notifications"],
            ["main", "Main"],
        ]) {
            await page.getByTestId(`config-tab-${segment}`).click();
            await expect(page).toHaveURL(new RegExp(`/config/${segment}$`));
            await expect(
                page.getByRole("tab", {name: label, selected: true}),
            ).toBeVisible();
        }

        // Only the initial load fetches the config: the shell holds it for
        // the whole visit rather than refetching per tab.
        await page.getByTestId("config-api-help").click();
        const dialog = page.getByTestId("config-api-help-dialog");
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText("Newznab API endpoint:");
        await expect(dialog).toContainText("Torznab API endpoint:");
        await expect(dialog).toContainText("API key:");
    });
});

test.describe("Config shell visual evidence", () => {
    for (const viewport of ["desktop", "mobile"] as const) {
        test(`should capture the config shell states at ${viewport}`, async ({
            page,
            hydra,
        }) => {
            await hydra.getConfig();

            await prepareVisualEvidence(page, viewport, async () => {
                await openConfig(page);
            });
            await page.screenshot({
                path: visualEvidencePath("F-CONFIG-SHELL", `shell-${viewport}`),
            });

            // The three dialog states are driven from crafted validation
            // results: the real backend cannot be asked for a validation
            // error, a warning, and a restart on demand, and a system test
            // must never restart the instance it is running against.
            await routeSaveResult(page, {
                ok: false,
                restartNeeded: false,
                errorMessages: [
                    "Port must be a number between 1 and 65535",
                    "The API key must not be empty",
                ],
                warningMessages: ["No indexer is configured"],
                newConfig: null,
            });
            await page.getByTestId("config-save").click();
            const errors = page.getByTestId("config-validation-errors");
            await expect(errors).toBeVisible();
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-SHELL",
                    `validation-errors-${viewport}`,
                ),
            });
            await errors.getByRole("button", {name: "OK"}).click();
            await expect(errors).toBeHidden();

            const currentConfig = await hydra.getConfig();
            await routeSaveResult(page, {
                ok: true,
                restartNeeded: false,
                errorMessages: [],
                warningMessages: [
                    "The configured download folder does not exist",
                ],
                newConfig: currentConfig,
            });
            await page.getByTestId("config-save").click();
            const warnings = page.getByTestId("config-validation-warnings");
            await expect(warnings).toBeVisible();
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-SHELL",
                    `validation-warnings-${viewport}`,
                ),
            });
            await warnings.getByRole("button", {name: "OK"}).click();
            await expect(warnings).toBeHidden();

            await routeSaveResult(page, {
                ok: true,
                restartNeeded: true,
                errorMessages: [],
                warningMessages: [],
                newConfig: currentConfig,
            });
            // Neither the restart nor the readiness poll may reach the real
            // instance: the restart is answered locally and the ping keeps
            // failing so the progress dialog stays on screen to be captured.
            await page.route("**/internalapi/control/restart", (route) =>
                route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify({successful: true, message: null}),
                }),
            );
            await page.route("**/internalapi/control/ping", (route) =>
                route.abort(),
            );
            await page.getByTestId("config-save").click();
            const restartRequired = page.getByTestId("config-restart-required");
            await expect(restartRequired).toBeVisible();
            await restartRequired.getByRole("button", {name: "Yes"}).click();

            const progress = page.getByTestId("restart-progress-dialog");
            await expect(progress).toBeVisible();
            await expect(
                page.getByTestId("restart-progress-message"),
            ).toContainText("Will reload page when NZBHydra is back.");
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-SHELL",
                    `restart-progress-${viewport}`,
                ),
            });
        });
    }
});

async function routeSaveResult(page: Page, result: unknown): Promise<void> {
    await page.unroute("**/internalapi/config");
    await page.route("**/internalapi/config", async (route) => {
        if (route.request().method() !== "PUT") {
            await route.continue();
            return;
        }
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(result),
        });
    });
}
