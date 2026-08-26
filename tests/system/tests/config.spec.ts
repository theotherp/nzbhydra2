import type {Page} from "@playwright/test";

import {dismissWelcomeDialog, expect, test} from "./fixtures";
import {prepareVisualEvidence, visualEvidencePath} from "./visualEvidence";

const UNCHANGED_MARKER = "***UNCHANGED***";

type Json = Record<string, unknown>;

async function openConfig(page: Page): Promise<void> {
    await page.goto("/config/main");
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

    test("should summarize unsaved changes, badge their section, and undo them on Discard", async ({
        page,
        hydra,
    }) => {
        const before = await hydra.getConfig();
        await openConfig(page);

        const host = page.getByTestId("config-input-main-host");
        const loaded = await host.inputValue();
        await expect(page.getByTestId("config-dirty-summary")).toBeHidden();
        await expect(page.getByTestId("config-discard")).toBeHidden();
        await expect(page.getByTestId("config-nav-dirty-main")).toBeHidden();

        await host.fill("127.0.0.2");
        // Blur so React Hook Form has committed the edit before the assertions.
        await host.blur();

        await expect(page.getByTestId("config-dirty-summary")).toHaveText(
            "1 setting changed",
        );
        const dirtyDot = page.getByTestId("config-nav-dirty-main");
        await expect(dirtyDot).toBeVisible();
        // Colour is never the sole carrier of the badge's meaning.
        await expect(dirtyDot).toHaveAttribute(
            "aria-label",
            "Main has unsaved changes",
        );
        // Only the edited section is badged.
        await expect(
            page.getByTestId("config-nav-dirty-searching"),
        ).toBeHidden();

        await page.getByTestId("config-discard").click();

        await expect(host).toHaveValue(loaded);
        await expect(page.getByTestId("config-dirty-summary")).toBeHidden();
        await expect(page.getByTestId("config-discard")).toBeHidden();
        await expect(page.getByTestId("config-nav-dirty-main")).toBeHidden();

        // Discard is a form reset, never a write: the instance is untouched.
        expect(allowReMaskedSecrets(await hydra.getConfig(), before)).toEqual(
            before,
        );
    });

    test("should name an invalid setting that is hidden, and lead back to it", async ({
        page,
        hydra,
    }) => {
        const before = await hydra.getConfig();
        await openConfig(page);

        const puts: string[] = [];
        page.on("request", (request) => {
            if (
                request.method() === "PUT" &&
                new URL(request.url()).pathname === "/internalapi/config"
            ) {
                puts.push(request.url());
            }
        });

        // Break an advanced setting and then let it go back into hiding. This
        // is the case the growl this replaces could not answer at all: it said
        // the config was invalid while the control it meant was not on screen,
        // on any tab, and named nothing.
        const toggle = page.getByTestId("config-advanced-toggle");
        await toggle.click();
        const urlBase = page.getByTestId("config-input-main-urlBase");
        await expect(urlBase).toBeVisible();
        await urlBase.fill("nope");
        await urlBase.blur();
        await toggle.click();
        await expect(
            page.getByTestId("config-setting-main-urlBase"),
        ).toBeHidden();

        await page.getByTestId("config-save").click();

        const entry = page.getByTestId("config-invalid-field-main-urlBase");
        await expect(entry).toHaveText(
            "Main › URL base: URL base has to start and may not end with /",
        );
        expect(puts, "an invalid form must not be submitted").toEqual([]);

        await entry.click();

        // FM-099's helper does the rest: reveal the row behind its gate,
        // scroll to it and mark it, without touching the stored preference.
        const row = page.getByTestId("config-setting-main-urlBase");
        await expect(row).toBeVisible();
        await expect(row).toBeInViewport();
        await expect(toggle).not.toBeChecked();
        await expect
            .poll(() =>
                row.evaluate((element) => getComputedStyle(element).boxShadow),
            )
            .not.toBe("none");

        // Reporting an invalid config is not writing one.
        expect(allowReMaskedSecrets(await hydra.getConfig(), before)).toEqual(
            before,
        );
    });
});

test.describe("Config review changes before save", () => {
    /**
     * A save rewrites the whole configuration file, so the panel's job is to
     * make an accidental edit visible before it is persisted. These cases
     * therefore drive a *real* mixed edit: a scalar on the tab that is left
     * behind, and a list entry that must be summarized rather than exploded
     * into one row per field.
     */
    test("should list a scalar change and a list entry, then persist both from the panel", async ({
        page,
        hydra,
    }) => {
        await hydra.configureMockIndexers(["1"]);
        const before = (await hydra.getConfig()) as Json;
        const updateAutomatically = (before.main as Json).updateAutomatically;

        await openConfig(page);
        await page.getByTestId("config-input-main-updateAutomatically").click();
        await expect(page.getByTestId("config-dirty-summary")).toBeVisible();

        // Move on to another tab and change a list entry there: the Main edit
        // is now on a tab that is not mounted any more, which is exactly the
        // state the panel has to survive.
        await page.getByTestId("config-tab-indexers").click();
        const score = page.getByTestId("config-input-indexers-0-score");
        await expect(score).toBeVisible();
        await score.fill("9");
        await score.blur();

        await page.getByTestId("config-dirty-summary").click();
        const panel = page.getByTestId("config-review-changes");
        await expect(panel).toBeVisible();

        const switchRow = panel.getByTestId(
            "config-review-entry-main-updateAutomatically",
        );
        await expect(switchRow).toContainText("Install updates automatically");
        await expect(switchRow).toContainText("Main › Updates");
        await expect(switchRow).toContainText(
            updateAutomatically === true ? "on" : "off",
        );
        await expect(switchRow).toContainText(
            updateAutomatically === true ? "off" : "on",
        );

        // One row for the whole entry, naming it the way the save resolves it.
        const indexerRow = panel.getByTestId(
            "config-review-entry-indexers-Mock1",
        );
        await expect(indexerRow).toContainText("Indexers: Mock1");
        await expect(indexerRow).toContainText("edited");
        await expect(panel.getByTestId(/^config-review-entry-/)).toHaveCount(2);

        const saved = page.waitForResponse(
            (response) =>
                response.request().method() === "PUT" &&
                new URL(response.url()).pathname === "/internalapi/config",
        );
        await panel.getByTestId("config-review-save").click();
        expect((await saved).status()).toBe(200);

        await expect(panel).toBeHidden();
        await expect(page.getByTestId("config-dirty-summary")).toBeHidden();

        const after = (await hydra.getConfig()) as Json;
        expect((after.main as Json).updateAutomatically).toBe(
            updateAutomatically !== true,
        );
        expect(((after.indexers as Json[])[0] as Json).score).toBe(9);
    });

    test("should report a refused save over the panel, and lead to the setting", async ({
        page,
        hydra,
    }) => {
        const before = await hydra.getConfig();
        await openConfig(page);

        // The panel's Save is the form's own Save, so a config the form
        // refuses is refused from here too -- and the report has to arrive
        // somewhere the admin can reach, which under a modal dialog is the
        // whole difficulty. Playwright's actionability checks are the proof:
        // it refuses to click an element the backdrop covers.
        const host = page.getByTestId("config-input-main-host");
        await host.fill("not-an-ip");
        await host.blur();

        await page.getByTestId("config-dirty-summary").click();
        const panel = page.getByTestId("config-review-changes");
        await expect(panel).toBeVisible();
        await panel.getByTestId("config-review-save").click();

        const entry = page.getByTestId("config-invalid-field-main-host");
        await expect(entry).toHaveText(
            "Main › Host: not-an-ip is not a valid IP Address",
        );
        // FM-100's contract: only a real save closes the panel.
        await expect(panel).toBeVisible();

        await entry.click();

        // Acting on the report means leaving the review that was covering the
        // control, and arriving at the control itself.
        await expect(panel).toBeHidden();
        const row = page.getByTestId("config-setting-main-host");
        await expect(row).toBeVisible();
        await expect(row).toBeInViewport();

        // Nothing was sent, so nothing was written.
        expect(allowReMaskedSecrets(await hydra.getConfig(), before)).toEqual(
            before,
        );
    });

    test("should never show a secret's value, and close without changing anything", async ({
        page,
        hydra,
    }) => {
        const before = (await hydra.getConfig()) as Json;
        const apiKey = (before.main as Json).apiKey;
        await openConfig(page);

        await page.getByTestId("config-apikey-generate-main-apiKey").click();
        const generated = await page
            .getByTestId("config-input-main-apiKey")
            .inputValue();
        expect(generated).not.toBe("");

        await page.getByTestId("config-dirty-summary").click();
        const panel = page.getByTestId("config-review-changes");
        const row = panel.getByTestId("config-review-entry-main-apiKey");
        await expect(row).toContainText("API key");
        await expect(row).toContainText("changed");
        const shown = (await panel.textContent()) ?? "";
        expect(shown).toContain("(hidden)");
        expect(shown).not.toContain(generated);
        expect(shown).not.toContain(UNCHANGED_MARKER);

        // Close is not a save and not a discard: the edit is still pending and
        // the instance is untouched.
        await panel.getByTestId("config-review-close").click();
        await expect(panel).toBeHidden();
        await expect(page.getByTestId("config-input-main-apiKey")).toHaveValue(
            generated,
        );
        expect(((await hydra.getConfig()) as Json).main).toMatchObject({
            apiKey,
        });
    });
});

test.describe("Config settings search", () => {
    /** Type into the search field and wait for its listbox to open. */
    async function search(page: Page, query: string): Promise<void> {
        await page.getByTestId("config-search").fill(query);
        await expect(page.getByRole("listbox")).toBeVisible();
    }

    test("should jump from Main to a setting on the Searching tab", async ({
        page,
        hydra,
    }) => {
        await hydra.getConfig();
        await openConfig(page);
        // The field is in the sticky bar, so it is reachable from anywhere in
        // a long tab; scrolling to the bottom of Main first proves that.
        await page.getByTestId("config-search").scrollIntoViewIfNeeded();

        await search(page, "cover width");
        await page
            .getByTestId("config-search-option-searching-coverSize")
            .click();

        await expect(page).toHaveURL(/\/config\/searching$/);
        const row = page.getByTestId("config-setting-searching-coverSize");
        await expect(row).toBeVisible();
        await expect(row).toBeInViewport();
        // The query is cleared, so the next search starts fresh.
        await expect(page.getByTestId("config-search")).toHaveValue("");
    });

    test("should find a setting by its help text, not only its label", async ({
        page,
        hydra,
    }) => {
        await hydra.getConfig();
        await openConfig(page);

        // "garbage collection" appears only in this setting's help text.
        await search(page, "garbage collection");
        await expect(
            page.getByTestId("config-search-option-main-logging-logGc"),
        ).toBeVisible();
    });

    test("should reveal and highlight an advanced setting while the toggle stays off", async ({
        page,
        hydra,
    }) => {
        await hydra.getConfig();
        await openConfig(page);

        const toggle = page.getByTestId("config-advanced-toggle");
        await expect(toggle).not.toBeChecked();
        const row = page.getByTestId("config-setting-main-urlBase");
        await expect(row).toBeHidden();
        await expect(
            page.getByTestId("config-advanced-expander-hosting"),
        ).toBeVisible();

        await search(page, "url base");
        await page.getByTestId("config-search-option-main-urlBase").click();

        await expect(row).toBeVisible();
        await expect(row).toBeInViewport();
        // Revealed in place: the global preference is untouched, so every
        // other advanced row on the tab is still hidden.
        await expect(toggle).not.toBeChecked();
        await expect(
            page.getByTestId("config-setting-main-dereferer"),
        ).toBeHidden();
        expect(
            await page.evaluate(() =>
                window.localStorage.getItem("hydra.config.showAdvanced"),
            ),
        ).toBeNull();

        // The temporary mark is really painted, and really clears itself.
        await expect
            .poll(() =>
                row.evaluate((element) => getComputedStyle(element).boxShadow),
            )
            .not.toBe("none");
        await expect
            .poll(
                () =>
                    row.evaluate(
                        (element) => getComputedStyle(element).boxShadow,
                    ),
                {timeout: 10_000},
            )
            .toBe("none");
    });

    test("should reveal an advanced setting on another tab, in a wholly advanced fieldset", async ({
        page,
        hydra,
    }) => {
        await hydra.getConfig();
        await openConfig(page);

        // The case above picks a Main setting while already on Main, so its
        // fieldset was mounted before the reveal was ever asked for. Crossing
        // tabs is the other, ordinary half: the router mounts the Searching
        // fieldsets only after the request exists, so each of them must act on
        // a request that was already outstanding at its first render. This is
        // also the shape FM-098 gives a fieldset that is advanced as a whole
        // ("Indexer access"), whose expander replaces the fieldset itself.
        const toggle = page.getByTestId("config-advanced-toggle");
        await expect(toggle).not.toBeChecked();

        await search(page, "timeout when accessing");
        await page
            .getByTestId("config-search-option-searching-timeout")
            .click();

        await expect(page).toHaveURL(/\/config\/searching$/);
        const expander = page.getByTestId(
            "config-advanced-expander-indexer access",
        );
        await expect(expander).toHaveAttribute("aria-expanded", "true");
        const row = page.getByTestId("config-setting-searching-timeout");
        await expect(row).toBeVisible();
        await expect(row).toBeInViewport();
        // Only the fieldset that was asked, and never the stored preference.
        await expect(
            page.getByTestId("config-advanced-expander-category handling"),
        ).toHaveAttribute("aria-expanded", "false");
        await expect(toggle).not.toBeChecked();
        expect(
            await page.evaluate(() =>
                window.localStorage.getItem("hydra.config.showAdvanced"),
            ),
        ).toBeNull();

        await expect
            .poll(() =>
                row.evaluate((element) => getComputedStyle(element).boxShadow),
            )
            .not.toBe("none");
    });

    test("should not save the configuration when Enter is pressed in the search field", async ({
        page,
        hydra,
    }) => {
        await hydra.getConfig();
        await openConfig(page);

        const puts: string[] = [];
        page.on("request", (request) => {
            if (
                request.method() === "PUT" &&
                new URL(request.url()).pathname === "/internalapi/config"
            ) {
                puts.push(request.url());
            }
        });

        // A real browser, a real form, a real Enter: this is the implicit
        // submission that would otherwise save the whole configuration.
        await page.getByTestId("config-search").fill("cover width");
        await page.getByTestId("config-search").press("Enter");

        // Enter still does what the listbox means it to do.
        await expect(page).toHaveURL(/\/config\/searching$/);
        await expect(
            page.getByTestId("config-setting-searching-coverSize"),
        ).toBeVisible();
        expect(puts, "Enter in the settings search must not save").toEqual([]);
        await expect(page.getByText("Configuration saved.")).toBeHidden();
    });
});

test.describe("Config settings search visual evidence", () => {
    for (const viewport of ["desktop", "mobile"] as const) {
        test(`should capture the settings search at ${viewport}`, async ({
            page,
            hydra,
        }) => {
            await hydra.getConfig();
            await prepareVisualEvidence(page, viewport, async () => {
                await openConfig(page);
            });

            // The grouped result list, open over more than one tab's worth of
            // hits so the group headers and the advanced marks are both shown.
            await page.getByTestId("config-search").fill("restart");
            await expect(page.getByRole("listbox")).toBeVisible();
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-SHELL",
                    `search-results-${viewport}`,
                ),
            });
            await page.keyboard.press("Escape");

            // The landed-on row: an advanced setting revealed by the search
            // with the global toggle still off, while its highlight is up.
            await page.getByTestId("config-search").fill("url base");
            await expect(page.getByRole("listbox")).toBeVisible();
            await page.getByTestId("config-search-option-main-urlBase").click();
            const row = page.getByTestId("config-setting-main-urlBase");
            await expect(row).toBeVisible();
            // The row was revealed by an advanced expander, so it mounts inside
            // a `Collapse` that is still opening. `prepareVisualEvidence` kills
            // CSS transitions but not MUI's own JS transition state, and while
            // that is in flight the Collapse still clips: a shot taken then
            // shows the mark cut off at the row's top edge rather than as it
            // renders. Wait for the Collapse to report itself settled.
            await expect
                .poll(() =>
                    row.evaluate((element) => {
                        const collapse = element.closest(".MuiCollapse-root");
                        return collapse === null
                            ? "visible"
                            : getComputedStyle(collapse).overflow;
                    }),
                )
                .toBe("visible");
            // The mark clears itself after a couple of seconds, so fail loudly
            // rather than capturing a shot that silently missed the window.
            await expect
                .poll(
                    () =>
                        row.evaluate(
                            (element) => getComputedStyle(element).boxShadow,
                        ),
                    {timeout: 1000},
                )
                .not.toBe("none");
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-SHELL",
                    `search-highlight-${viewport}`,
                ),
            });
        });
    }
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

            // FM-097's two new chrome states. Desktop shows the sticky bar's
            // dirty branch with a section badge beside it; mobile shows the
            // settings nav in its drawer, since the docked column only exists
            // at `md` and up (the shot above is that viewport's closed state).
            if (viewport === "desktop") {
                const host = page.getByTestId("config-input-main-host");
                await host.fill("127.0.0.2");
                await host.blur();
                await expect(
                    page.getByTestId("config-dirty-summary"),
                ).toBeVisible();
                await expect(
                    page.getByTestId("config-nav-dirty-main"),
                ).toBeVisible();
                await page.screenshot({
                    path: visualEvidencePath(
                        "F-CONFIG-SHELL",
                        `shell-dirty-${viewport}`,
                    ),
                });
                await page.getByTestId("config-discard").click();
                await expect(
                    page.getByTestId("config-dirty-summary"),
                ).toBeHidden();
            } else {
                await page.getByTestId("config-nav-open").click();
                await expect(page.getByTestId("config-nav")).toBeVisible();
                await page.screenshot({
                    path: visualEvidencePath(
                        "F-CONFIG-SHELL",
                        `shell-nav-drawer-${viewport}`,
                    ),
                });
                await page.keyboard.press("Escape");
                await expect(page.getByTestId("config-nav")).toBeHidden();
            }

            // FM-101's client-side half needs no crafted response at all: the
            // form refuses to submit and names the offending settings itself.
            const invalidHost = page.getByTestId("config-input-main-host");
            await invalidHost.fill("not-an-ip");
            await invalidHost.blur();
            await page.getByTestId("config-save").click();
            await expect(
                page.getByTestId("config-invalid-field-main-host"),
            ).toBeVisible();
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-SHELL",
                    `validation-invalid-fields-${viewport}`,
                ),
            });
            // Discarding resets the form, which clears the errors the report
            // was derived from.
            await page.getByTestId("config-discard").click();
            await expect(
                page.getByTestId("config-validation-errors"),
            ).toBeHidden();

            // The remaining states are driven from crafted validation results:
            // the real backend cannot be asked for a validation error, a
            // warning, and a restart on demand, and a system test must never
            // restart the instance it is running against.
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
            await errors.getByRole("button", {name: "Close"}).click();
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
            await warnings.getByRole("button", {name: "Close"}).click();
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

test.describe("Config review changes visual evidence", () => {
    /** Below `md` the settings nav is a temporary `Drawer` (FM-097). */
    async function goToConfigTab(page: Page, tab: string): Promise<void> {
        const navOpen = page.getByTestId("config-nav-open");
        if (await navOpen.isVisible()) {
            await navOpen.click();
            await expect(page.getByTestId("config-nav")).toBeVisible();
        }
        await page.getByTestId(`config-tab-${tab}`).click();
    }

    for (const viewport of ["desktop", "mobile"] as const) {
        test(`should capture a refused save over the panel at ${viewport}`, async ({
            page,
        }) => {
            await prepareVisualEvidence(page, viewport, async () => {
                await openConfig(page);
            });

            const host = page.getByTestId("config-input-main-host");
            await host.fill("not-an-ip");
            await host.blur();
            await page.getByTestId("config-dirty-summary").click();
            const panel = page.getByTestId("config-review-changes");
            await expect(panel).toBeVisible();
            await panel.getByTestId("config-review-save").click();
            await expect(
                page.getByTestId("config-invalid-field-main-host"),
            ).toBeVisible();
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-SHELL",
                    `validation-over-review-${viewport}`,
                ),
            });
        });
    }

    for (const viewport of ["desktop", "mobile"] as const) {
        test(`should capture the review panel at ${viewport}`, async ({
            page,
            hydra,
        }) => {
            await hydra.configureMockIndexers(["1"]);
            await prepareVisualEvidence(page, viewport, async () => {
                await openConfig(page);
            });

            // The three row shapes the panel has to render at once: a plain
            // scalar, a secret that must not be shown, and a list entry.
            await page
                .getByTestId("config-input-main-updateAutomatically")
                .click();
            await page
                .getByTestId("config-apikey-generate-main-apiKey")
                .click();
            await goToConfigTab(page, "indexers");
            const score = page.getByTestId("config-input-indexers-0-score");
            await expect(score).toBeVisible();
            await score.fill("9");
            await score.blur();

            await page.getByTestId("config-dirty-summary").click();
            const panel = page.getByTestId("config-review-changes");
            await expect(panel).toBeVisible();
            await expect(
                panel.getByTestId("config-review-entry-main-apiKey"),
            ).toBeVisible();
            await expect(
                panel.getByTestId("config-review-entry-indexers-Mock1"),
            ).toBeVisible();
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-SHELL",
                    `review-changes-${viewport}`,
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
