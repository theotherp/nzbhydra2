import type {Page} from "@playwright/test";

import {dismissWelcomeDialog, expect, test, testEnvironment} from "./fixtures";
import {prepareVisualEvidence, visualEvidencePath} from "./visualEvidence";

type Json = Record<string, unknown>;

const INDEXER_NAME = "System Test Newznab";
const MOCK_HOST = testEnvironment.mockserverInternalUrl;
/** Reachable but not an indexer, so the backend's check fails quickly. */
const BROKEN_HOST = `${testEnvironment.mockserverInternalUrl}/definitely-not-an-indexer`;

function indexersOf(config: Json): Json[] {
    return (config.indexers ?? []) as Json[];
}

function withIndexers(config: Json, indexers: Json[]): Json {
    return {...config, indexers};
}

function mockIndexer(overrides: Json = {}): Json {
    return {
        allCapsChecked: true,
        apiKey: "1",
        apiPath: "/api",
        backend: "NEWZNAB",
        configComplete: true,
        host: MOCK_HOST,
        name: "Mock1",
        score: 0,
        searchModuleType: "NEWZNAB",
        state: "ENABLED",
        supportedSearchIds: ["IMDB", "TVMAZE"],
        supportedSearchTypes: ["SEARCH", "TVSEARCH", "MOVIE", "BOOK"],
        ...overrides,
    };
}

async function openIndexersConfig(page: Page): Promise<void> {
    await page.goto("ui/react?redirect=/config/indexers");
    await dismissWelcomeDialog(page);
    await expect(page.getByTestId("config-shell")).toBeVisible();
    await expect(page.getByTestId("config-indexers")).toBeVisible();
}

/**
 * The advanced toggle is a per-browser preference in `localStorage`, and the
 * `page` fixture clears storage on every document load.
 */
async function showAdvanced(page: Page): Promise<void> {
    const toggle = page.getByRole("switch", {name: "Advanced settings"});
    await toggle.setChecked(true);
    await expect(toggle).toBeChecked();
}

function draftField(page: Page, field: string) {
    return page.getByTestId(`config-input-indexerDraft-${field}`);
}

async function addCustomNewznab(page: Page): Promise<void> {
    await page.getByTestId("config-indexer-add").click();
    await expect(page.getByTestId("config-indexer-add-dialog")).toBeVisible();
    await page
        .getByTestId("config-indexer-preset-newznab-custom-newznab")
        .click();
    await expect(page.getByTestId("config-indexer-dialog")).toBeVisible();
}

async function save(page: Page): Promise<void> {
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
    await expect(page.getByText("Configuration saved.")).toBeVisible();
}

test.describe("Config indexers round trip", () => {
    // The capability check issues eight throttled requests to the indexer, so
    // the real-backend path here is minutes-scale slower than a stubbed one.
    test.setTimeout(120_000);

    test("should add a checked indexer, complete its capabilities, and persist it as usable", async ({
        page,
        hydra,
    }) => {
        const before = (await hydra.getConfig()) as Json;
        await hydra.saveConfig(withIndexers(before, []));

        await openIndexersConfig(page);
        await expect(page.getByTestId("config-indexers-empty")).toBeVisible();

        // A failed connection check first: the real backend answers, the
        // dialog explains what failed, and "let me try again" commits nothing.
        await addCustomNewznab(page);
        await draftField(page, "name").fill(INDEXER_NAME);
        await draftField(page, "host").fill(BROKEN_HOST);
        await draftField(page, "apiKey").fill("1");
        const failedCheck = page.waitForResponse(
            (response) =>
                response.request().method() === "POST" &&
                new URL(response.url()).pathname ===
                    "/internalapi/indexer/checkConnection",
        );
        await page.getByTestId("config-indexer-dialog-submit").click();
        expect((await failedCheck).status()).toBe(200);
        const failureDialog = page.getByTestId(
            "config-indexer-connection-failed",
        );
        await expect(failureDialog).toBeVisible();
        await expect(
            failureDialog.getByText("Do you want to add it anyway?"),
        ).toBeVisible();
        await failureDialog
            .getByRole("button", {name: "Aahh, let me try again"})
            .click();
        await expect(failureDialog).toBeHidden();
        await expect(page.getByTestId("config-indexer-dialog")).toBeVisible();
        expect(indexersOf((await hydra.getConfig()) as Json)).toEqual([]);

        // Correcting the host makes the same check succeed, and the capability
        // check then runs against the mock indexer for real.
        await draftField(page, "host").fill(MOCK_HOST);
        const okCheck = page.waitForResponse(
            (response) =>
                response.request().method() === "POST" &&
                new URL(response.url()).pathname ===
                    "/internalapi/indexer/checkConnection",
        );
        const capsCheck = page.waitForResponse(
            (response) =>
                response.request().method() === "POST" &&
                new URL(response.url()).pathname ===
                    "/internalapi/indexer/checkCaps",
            {timeout: 90_000},
        );
        await page.getByTestId("config-indexer-dialog-submit").click();
        expect((await okCheck).status()).toBe(200);
        await expect(
            page.getByText("Connection to the indexer tested successfully"),
        ).toBeVisible();

        // The progress dialog polls the message endpoint while the check runs.
        const capsDialog = page.getByTestId("config-indexer-caps-dialog");
        await expect(capsDialog).toBeVisible();
        const messagePoll = page.waitForResponse(
            (response) =>
                response.request().method() === "GET" &&
                new URL(response.url()).pathname ===
                    "/internalapi/indexer/checkCapsMessages",
            {timeout: 30_000},
        );
        expect((await messagePoll).status()).toBe(200);
        expect((await capsCheck).status()).toBe(200);
        await expect(capsDialog).toBeHidden({timeout: 30_000});
        await expect(
            page.getByText("Successfully tested capabilites of indexer"),
        ).toBeVisible();
        await expect(page.getByTestId("config-indexer-dialog")).toBeHidden();

        await expect(page.getByTestId("config-indexer-entry-0")).toContainText(
            INDEXER_NAME,
        );
        await expect(
            page.getByTestId("config-indexer-incomplete-0"),
        ).toBeHidden();
        await expect(
            page.getByTestId("config-indexer-caps-incomplete-0"),
        ).toBeHidden();

        // Still nothing on disk: the modal transaction only reached the form.
        expect(indexersOf((await hydra.getConfig()) as Json)).toEqual([]);

        await save(page);

        // A full document load proves the entry was persisted rather than only
        // held in the form.
        await page.reload();
        await dismissWelcomeDialog(page);
        await expect(page.getByTestId("config-indexers")).toBeVisible();
        await expect(page.getByTestId("config-indexer-entry-0")).toContainText(
            INDEXER_NAME,
        );
        await expect(
            page.getByTestId("config-indexer-incomplete-0"),
        ).toBeHidden();

        const persisted = indexersOf((await hydra.getConfig()) as Json);
        expect(persisted).toHaveLength(1);
        expect(persisted[0]).toMatchObject({
            allCapsChecked: true,
            configComplete: true,
            host: MOCK_HOST,
            name: INDEXER_NAME,
            searchModuleType: "NEWZNAB",
            state: "ENABLED",
        });
        expect(
            (persisted[0].supportedSearchIds as string[]).length,
        ).toBeGreaterThan(0);
        expect(
            (persisted[0].supportedSearchTypes as string[]).length,
        ).toBeGreaterThan(0);
        // The typed API key round-trips masked, never in clear.
        expect(persisted[0].apiKey).toBe("***UNCHANGED***");

        // Reopening shows the masked secret as an empty field with its
        // placeholder, never as the marker text.
        await page.getByTestId("config-indexer-edit-0").click();
        await expect(page.getByTestId("config-indexer-dialog")).toBeVisible();
        await expect(draftField(page, "apiKey")).toHaveValue("");
        await expect(draftField(page, "apiKey")).toHaveAttribute(
            "placeholder",
            "Value unchanged",
        );
        await page.getByTestId("config-indexer-dialog-cancel").click();
    });

    test("should edit state and priority inline, discard a cancelled edit, and delete an entry", async ({
        page,
        hydra,
    }) => {
        const before = (await hydra.getConfig()) as Json;
        await hydra.saveConfig(
            withIndexers(before, [
                mockIndexer({name: "Mock1"}),
                mockIndexer({name: "Mock2", apiKey: "2", score: 5}),
            ]),
        );

        await openIndexersConfig(page);
        // Priority descending puts Mock2 first, but each row still edits its
        // own configuration entry.
        await expect(page.getByTestId("config-indexer-edit-1")).toHaveText(
            "Mock2",
        );

        // Cancel discards.
        await page.getByTestId("config-indexer-edit-0").click();
        await draftField(page, "name").fill("Renamed but cancelled");
        await page.getByTestId("config-indexer-dialog-cancel").click();
        await expect(page.getByTestId("config-indexer-dialog")).toBeHidden();
        await expect(page.getByTestId("config-indexer-edit-0")).toHaveText(
            "Mock1",
        );

        // The inline state and priority controls edit the configuration.
        await page
            .getByTestId("config-indexer-entry-0")
            .getByRole("switch")
            .click();
        await page.getByTestId("config-input-indexers-0-score").fill("9");
        await save(page);

        let persisted = indexersOf((await hydra.getConfig()) as Json);
        expect(persisted[0]).toMatchObject({
            name: "Mock1",
            score: 9,
            state: "DISABLED_USER",
        });

        // Delete removes the entry from the form; saving persists the removal.
        await page.getByTestId("config-indexer-edit-0").click();
        await page.getByTestId("config-indexer-dialog-delete").click();
        await expect(page.getByTestId("config-indexer-dialog")).toBeHidden();
        await save(page);

        persisted = indexersOf((await hydra.getConfig()) as Json);
        expect(persisted).toHaveLength(1);
        expect(persisted[0].name).toBe("Mock2");
    });

    test("should set a colour via the text field, clear it, and round-trip null", async ({
        page,
        hydra,
    }) => {
        const before = (await hydra.getConfig()) as Json;
        await hydra.saveConfig(
            withIndexers(before, [mockIndexer({name: "Mock1"})]),
        );

        await openIndexersConfig(page);
        await showAdvanced(page);

        await page.getByTestId("config-indexer-edit-0").click();
        await expect(page.getByTestId("config-indexer-dialog")).toBeVisible();

        await draftField(page, "color").fill("rgb(116,18,18)");
        await expect(draftField(page, "color")).toHaveValue("rgb(116,18,18)");
        await page.getByTestId("config-indexer-dialog-submit").click();
        await expect(page.getByTestId("config-indexer-dialog")).toBeHidden();
        await save(page);
        // FM-084 made toasts stack rather than replace each other; close this
        // one before the second `save()` below so its own "Configuration
        // saved." assertion still resolves to exactly one element.
        await page.getByRole("button", {name: "Close"}).click();
        await expect(page.getByText("Configuration saved.")).toBeHidden();

        let persisted = indexersOf((await hydra.getConfig()) as Json);
        expect(persisted[0].color).toBe("rgb(116,18,18)");

        // Clearing writes null -- not "" and not the native input's own
        // black default -- and that is what the save actually commits.
        await page.getByTestId("config-indexer-edit-0").click();
        await expect(page.getByTestId("config-indexer-dialog")).toBeVisible();
        await expect(draftField(page, "color")).toHaveValue("rgb(116,18,18)");

        await page.getByTestId("config-indexer-color-clear").click();
        await expect(draftField(page, "color")).toHaveValue("");
        await page.getByTestId("config-indexer-dialog-submit").click();
        await expect(page.getByTestId("config-indexer-dialog")).toBeHidden();
        await save(page);

        persisted = indexersOf((await hydra.getConfig()) as Json);
        expect(persisted[0].color).toBeNull();
    });
});

test.describe("Config indexers visual evidence", () => {
    test.setTimeout(120_000);

    for (const viewport of ["desktop", "mobile"] as const) {
        test(`should capture the Indexers tab states at ${viewport}`, async ({
            page,
            hydra,
        }) => {
            const before = (await hydra.getConfig()) as Json;
            await hydra.saveConfig(
                withIndexers(before, [
                    mockIndexer({name: "Mock1", score: 10}),
                    mockIndexer({
                        name: "Needs caps",
                        allCapsChecked: false,
                        apiKey: "2",
                    }),
                    mockIndexer({
                        name: "Broken",
                        allCapsChecked: false,
                        apiKey: "3",
                        configComplete: false,
                        state: "DISABLED_SYSTEM",
                    }),
                    mockIndexer({
                        name: "Expiring VIP",
                        apiKey: "1",
                        state: "DISABLED_USER",
                        vipExpirationDate: "2000-01-01",
                    }),
                ]),
            );

            await prepareVisualEvidence(page, viewport, async () => {
                await openIndexersConfig(page);
                await expect(
                    page.getByTestId("config-indexer-entry-3"),
                ).toBeVisible();
            });
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-INDEXERS",
                    `indexers-list-${viewport}`,
                ),
                fullPage: true,
            });

            await page.getByTestId("config-indexer-add").click();
            await expect(
                page.getByTestId("config-indexer-add-dialog"),
            ).toBeVisible();
            await page
                .getByTestId("config-indexer-preset-menu-newznab")
                .click();
            await expect(
                page.getByTestId("config-indexer-preset-newznab-nzbgeek"),
            ).toBeVisible();
            // Not `fullPage`: the menu is anchored in the viewport.
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-INDEXERS",
                    `indexers-add-menu-${viewport}`,
                ),
            });
            await page.keyboard.press("Escape");
            await page.keyboard.press("Escape");
            await expect(
                page.getByTestId("config-indexer-add-dialog"),
            ).toBeHidden();

            await page.getByTestId("config-indexer-edit-0").click();
            await expect(
                page.getByTestId("config-indexer-dialog"),
            ).toBeVisible();
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-INDEXERS",
                    `indexers-edit-modal-${viewport}`,
                ),
            });

            // The capability check's progress dialog, captured while the real
            // check is still running against the mock indexer.
            await page.getByTestId("config-indexer-check-caps").click();
            const capsDialog = page.getByTestId("config-indexer-caps-dialog");
            await expect(capsDialog).toBeVisible();
            await expect(
                page.getByTestId("config-indexer-caps-messages"),
            ).toBeVisible({timeout: 30_000});
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-INDEXERS",
                    `indexers-caps-progress-${viewport}`,
                ),
            });

            // Abandon the running check rather than waiting it out; the server
            // finishes it on its own and nothing was committed.
            await prepareVisualEvidence(page, viewport, async () => {
                await page.reload();
                await dismissWelcomeDialog(page);
                await expect(page.getByTestId("config-indexers")).toBeVisible();
            });
            await page.getByTestId("config-indexer-edit-0").click();
            await expect(
                page.getByTestId("config-indexer-dialog"),
            ).toBeVisible();
            await draftField(page, "host").fill(BROKEN_HOST);
            await page.getByTestId("config-indexer-dialog-submit").click();
            await expect(
                page.getByTestId("config-indexer-connection-failed"),
            ).toBeVisible({timeout: 30_000});
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-INDEXERS",
                    `indexers-connection-failed-${viewport}`,
                ),
            });
        });
    }

    // FM-092: the colour row's closed state (swatch, picker, and clear
    // adornments) with a value set. The native picker itself is an
    // OS-native dialog outside the page's rendered DOM -- Chromium never
    // paints it into a page screenshot, headless or headed -- so no "picker
    // open" capture exists; this is the row's only capturable state.
    for (const viewport of ["desktop", "mobile"] as const) {
        test(`should capture the colour row at ${viewport}`, async ({
            page,
            hydra,
        }) => {
            const before = (await hydra.getConfig()) as Json;
            await hydra.saveConfig(
                withIndexers(before, [
                    mockIndexer({color: "rgb(116,18,18)", name: "Mock1"}),
                ]),
            );

            await prepareVisualEvidence(page, viewport, async () => {
                await openIndexersConfig(page);
                await showAdvanced(page);
                await page.getByTestId("config-indexer-edit-0").click();
                await page
                    .getByTestId("config-indexer-color-picker")
                    .scrollIntoViewIfNeeded();
                await expect(
                    page.getByTestId("config-indexer-color-picker"),
                ).toBeVisible();
            });
            await page
                .getByTestId("config-setting-indexerDraft-color")
                .screenshot({
                    path: visualEvidencePath(
                        "F-CONFIG-INDEXERS",
                        `indexers-color-row-${viewport}`,
                    ),
                });
        });
    }
});

test.describe("Config indexers bulk caps recheck", () => {
    // A bulk check runs the same eight throttled requests per indexer as a
    // single one, so it is minutes-scale against the real backend.
    test.setTimeout(180_000);

    test("should recheck the incomplete indexers and merge the results without losing an unsaved edit", async ({
        page,
        hydra,
    }) => {
        const before = (await hydra.getConfig()) as Json;
        await hydra.saveConfig(
            withIndexers(before, [
                // Only this one is `INCOMPLETE`-eligible: enabled, newznab,
                // configComplete, and not yet fully caps-checked
                // (`IndexerChecker.checkCaps(CheckType)`).
                mockIndexer({
                    name: "Needs caps",
                    allCapsChecked: false,
                    supportedSearchIds: [],
                    supportedSearchTypes: [],
                }),
                mockIndexer({name: "Complete", apiKey: "2", score: 5}),
            ]),
        );

        // Every control binds to the entry's *configuration* index, and the
        // backend does not guarantee it keeps the order it was handed, so the
        // indices are read back rather than assumed.
        const stored = indexersOf((await hydra.getConfig()) as Json);
        const incomplete = stored.findIndex((x) => x.name === "Needs caps");
        const complete = stored.findIndex((x) => x.name === "Complete");
        expect(incomplete).toBeGreaterThanOrEqual(0);
        expect(complete).toBeGreaterThanOrEqual(0);

        await openIndexersConfig(page);
        await expect(
            page.getByTestId(`config-indexer-caps-incomplete-${incomplete}`),
        ).toBeVisible();

        // An unsaved edit to a field the capability check does not own. If the
        // merge replaced the whole entry this would silently revert.
        await page
            .getByTestId(`config-input-indexers-${incomplete}-score`)
            .fill("7");

        const capsCheck = page.waitForResponse(
            (response) =>
                response.request().method() === "POST" &&
                new URL(response.url()).pathname ===
                    "/internalapi/indexer/checkCaps",
            {timeout: 150_000},
        );
        await page.getByTestId("config-indexers-recheck-incomplete").click();

        const capsDialog = page.getByTestId("config-indexer-caps-dialog");
        await expect(capsDialog).toBeVisible();
        // A non-SINGLE check prefixes every polled line with the indexer name.
        await expect(
            page.getByTestId("config-indexer-caps-messages"),
        ).toContainText("Needs caps:", {timeout: 60_000});
        expect((await capsCheck).status()).toBe(200);
        await expect(capsDialog).toBeHidden({timeout: 60_000});

        // The checked entry now knows its capabilities and still carries the
        // edit; the entry no result named is untouched.
        await expect(
            page.getByTestId(`config-indexer-caps-incomplete-${incomplete}`),
        ).toBeHidden();
        await expect(
            page.getByTestId(`config-input-indexers-${incomplete}-score`),
        ).toHaveValue("7");
        await expect(
            page.getByTestId(`config-input-indexers-${complete}-score`),
        ).toHaveValue("5");

        // Nothing was persisted by the check itself.
        let persisted = indexersOf((await hydra.getConfig()) as Json);
        expect(persisted[incomplete]).toMatchObject({
            allCapsChecked: false,
            score: 0,
        });

        await save(page);

        persisted = indexersOf((await hydra.getConfig()) as Json);
        expect(persisted).toHaveLength(2);
        const checked = persisted.find((x) => x.name === "Needs caps") ?? {};
        expect(checked).toMatchObject({
            allCapsChecked: true,
            configComplete: true,
            score: 7,
        });
        expect((checked.supportedSearchIds as string[]).length).toBeGreaterThan(
            0,
        );
        expect(persisted.find((x) => x.name === "Complete")).toMatchObject({
            score: 5,
        });

        // Everything is complete now, so the same action checks nothing.
        await page.getByTestId("config-indexers-recheck-incomplete").click();
        await expect(page.getByText("No indexers were checked")).toBeVisible({
            timeout: 60_000,
        });
    });
});

test.describe("Config indexers bulk and import visual evidence", () => {
    test.setTimeout(180_000);

    for (const viewport of ["desktop", "mobile"] as const) {
        test(`should capture the recheck and import states at ${viewport}`, async ({
            page,
            hydra,
        }) => {
            const before = (await hydra.getConfig()) as Json;
            await hydra.saveConfig(
                withIndexers(before, [
                    mockIndexer({
                        name: "Needs caps",
                        allCapsChecked: false,
                        supportedSearchIds: [],
                        supportedSearchTypes: [],
                    }),
                    mockIndexer({name: "Complete", apiKey: "2", score: 5}),
                ]),
            );

            await prepareVisualEvidence(page, viewport, async () => {
                await openIndexersConfig(page);
                await expect(
                    page.getByTestId("config-indexers-recheck-all"),
                ).toBeVisible();
            });
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-INDEXERS",
                    `indexers-recheck-actions-${viewport}`,
                ),
                fullPage: true,
            });

            // The shared progress dialog, mid-check, showing the per-indexer
            // message prefix a bulk check adds.
            await page
                .getByTestId("config-indexers-recheck-incomplete")
                .click();
            await expect(
                page.getByTestId("config-indexer-caps-dialog"),
            ).toBeVisible();
            await expect(
                page.getByTestId("config-indexer-caps-messages"),
            ).toContainText("Needs caps:", {timeout: 60_000});
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-INDEXERS",
                    `indexers-bulk-caps-progress-${viewport}`,
                ),
            });

            // Abandon the running check; the server finishes it on its own and
            // nothing was committed.
            await prepareVisualEvidence(page, viewport, async () => {
                await page.reload();
                await dismissWelcomeDialog(page);
                await expect(page.getByTestId("config-indexers")).toBeVisible();
            });

            // The add surface, now carrying the two importers alongside the
            // preset groups.
            await page.getByTestId("config-indexer-add").click();
            await expect(
                page.getByTestId("config-indexer-add-dialog"),
            ).toBeVisible();
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-INDEXERS",
                    `indexers-add-with-imports-${viewport}`,
                ),
            });

            await page.getByTestId("config-indexer-import-prowlarr").click();
            await expect(
                page.getByTestId("config-indexer-import-dialog"),
            ).toBeVisible();
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-INDEXERS",
                    `indexers-import-dialog-${viewport}`,
                ),
            });

            // Nothing is listening on Prowlarr's default port here, so the
            // real backend answers with the failure the dialog has to survive.
            await page
                .getByTestId("config-indexer-import-dialog-submit")
                .click();
            await expect(
                page.getByTestId("config-indexer-import-error"),
            ).toBeVisible({timeout: 60_000});
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-INDEXERS",
                    `indexers-import-failed-${viewport}`,
                ),
            });
        });
    }
});
