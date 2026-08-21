import {APIRequestContext, Locator, Page, Response} from "@playwright/test";

import {dismissWelcomeDialog, expect, test, testEnvironment} from "./fixtures";
import {prepareVisualEvidence, visualEvidencePath} from "./visualEvidence";

type Json = Record<string, unknown>;

const TEST_TOOL_PREFIX = "UI System Test";
const LIST = "externalTools-externalTools";
const DIALOG = "config-external-tool-dialog";
const DRAFT = "config-input-externalTools-externalToolDraft";
const DIALOG_TITLE = "External Tool Configuration";
/** Reachable but not an *arr instance, so the backend's test fails quickly. */
const BROKEN_URL = `${testEnvironment.mockserverInternalUrl}/definitely-not-sonarr`;

/**
 * `AddRequest`'s ten `boolean` primitives. A flag the UI dropped would silently
 * disable a feature in the *arr instance being written to, so every request
 * this tab sends is checked for all of them.
 */
const addRequestBooleans = [
    "configureForUsenet",
    "configureForTorrents",
    "enableRss",
    "enableAutomaticSearch",
    "enableInteractiveSearch",
    "removeYearFromSearchString",
    "addUsenet",
    "addTorrent",
    "addDisabledIndexers",
    "useHydraPriorities",
];

test.describe("External Tools Configuration", () => {
    test.beforeEach(async ({page, hydra}) => {
        await hydra.configureMockIndexers(["1", "2", "3"]);
        await hydra.assertUniqueIndexerCredentials();
        const config = await hydra.getConfig();
        config.externalTools = {syncOnConfigChange: false, externalTools: []};
        await hydra.saveConfig(config);
        await openExternalTools(page);
    });

    test.afterEach(async ({request}) => {
        const results = await Promise.allSettled([
            deleteTestOwnedIndexers(request, testEnvironment.sonarrExternalUrl),
            deleteTestOwnedIndexers(request, testEnvironment.radarrExternalUrl),
        ]);
        const failures = results.filter(
            (result): result is PromiseRejectedResult =>
                result.status === "rejected",
        );
        expect(
            failures.map((failure) => String(failure.reason)),
            "External-tool cleanup failures",
        ).toEqual([]);
    });

    test("should display External Tools tab in configuration", async ({
        page,
    }) => {
        await page.goto("ui/react?redirect=/config/main");
        await dismissWelcomeDialog(page);
        await expect(page.getByTestId("config-shell")).toBeVisible();

        await expect(page.getByTestId("config-tab-externalTools")).toHaveText(
            "External Tools",
        );
    });

    test("should navigate to External Tools configuration", async ({page}) => {
        await expect(syncOnConfigChange(page)).toBeVisible();
        await expect(page.getByTestId(`config-repeat-add-${LIST}`)).toHaveText(
            /Add external tool/,
        );
        await expect(
            page.getByTestId("config-external-tools-sync-all"),
        ).toHaveText(/Sync all now/i);
    });

    test("should show empty state when no external tools configured", async ({
        page,
    }) => {
        await expect(
            page.getByRole("heading", {name: "No external tools configured"}),
        ).toBeVisible();
    });

    test("should open external tool configuration modal with presets", async ({
        page,
    }) => {
        await page.getByTestId(`config-repeat-add-${LIST}`).click();

        for (const [preset, label] of [
            ["SONARR", "Sonarr"],
            ["RADARR", "Radarr"],
            ["LIDARR", "Lidarr"],
            ["READARR", "Readarr"],
            ["CUSTOM", "Custom"],
        ]) {
            await expect(
                page.getByTestId(`config-repeat-add-option-${LIST}-${preset}`),
            ).toHaveText(label);
        }
    });

    test("should open Sonarr preset configuration modal", async ({page}) => {
        await openPreset(page, "SONARR");

        await expect(
            page.getByRole("heading", {name: DIALOG_TITLE}),
        ).toBeVisible();
        await expect(draftField(page, "name")).toHaveValue("Sonarr");
        await expect(draftField(page, "host")).toHaveValue(
            "http://localhost:8989",
        );
        await expect(draftField(page, "categories")).toHaveValue("5030,5040");
        await expect(draftField(page, "nzbhydraName")).toHaveValue("NZBHydra2");
        await expect(draftSwitch(page, "Enabled")).toBeChecked();
        await expect(draftSwitch(page, "Configure for Usenet")).toBeChecked();
        await expect(draftSwitch(page, "Enable RSS")).toBeChecked();
        await expect(
            draftSwitch(page, "Enable automatic search"),
        ).toBeChecked();
        await expect(
            draftSwitch(page, "Enable interactive search"),
        ).toBeChecked();
        // Sonarr's own advanced field, and none of the other types'.
        await expect(draftField(page, "animeCategories")).toBeVisible();
        await expect(
            page.getByTestId(`${DRAFT}-removeYearFromSearchString`),
        ).toBeHidden();

        await closeModal(page);
    });

    test("should validate required fields in external tool configuration", async ({
        page,
    }) => {
        await openPreset(page, "CUSTOM");
        await draftField(page, "name").fill("");
        await draftField(page, "host").fill("");
        await page.getByTestId(`${DIALOG}-submit`).click();

        await expect(
            page.getByTestId(
                "config-error-externalTools-externalToolDraft-name",
            ),
        ).toHaveText("This field is required");
        await expect(
            page.getByTestId(
                "config-error-externalTools-externalToolDraft-host",
            ),
        ).toHaveText("This field is required");
        await expect(
            page.getByText("Config invalid. Please check your settings."),
        ).toBeVisible();
        await expect(page.getByTestId(DIALOG)).toBeVisible();
    });

    test("should save external tool configuration", async ({hydra, page}) => {
        await addRadarr(page, "UI System Test Radarr Save");
        await saveConfiguration(page, hydra, "UI System Test Radarr Save");

        await expect(
            page.getByTestId(`config-repeat-entry-${LIST}-0`),
        ).toContainText("UI System Test Radarr Save");
        await expect(
            page.getByTestId("config-external-tool-value-0-host"),
        ).toHaveText(testEnvironment.radarrInternalUrl);
        await expect(
            page.getByTestId("config-external-tool-value-0-type"),
        ).toHaveText("RADARR");
        await expect(
            page.getByTestId(`config-repeat-remove-${LIST}-0`),
        ).toBeVisible();
    });

    test("should test connection to external tool", async ({page}) => {
        await openPreset(page, "SONARR");
        await draftField(page, "host").fill(testEnvironment.sonarrInternalUrl);
        await draftField(page, "apiKey").fill(testEnvironment.sonarrApiKey);
        const connectionResponse = waitForExternalResponse(
            page,
            "testConnection",
        );
        await page.getByTestId(`${DIALOG}-test`).click();

        const response = await connectionResponse;
        await expectConnectionSuccess(response);
        expectCompleteAddRequest(response);
        // A test must never write: legacy's add type for it is DELETE_ONLY.
        expect(addRequestOf(response).addType).toBe("DELETE_ONLY");
        await expect(
            page.getByText("Connection test successful"),
        ).toBeVisible();
        await expect(page.getByTestId(DIALOG)).toBeVisible();
    });

    test("should report a failed connection test without closing the dialog", async ({
        page,
    }) => {
        await openPreset(page, "SONARR");
        await draftField(page, "host").fill(BROKEN_URL);
        await draftField(page, "apiKey").fill(testEnvironment.sonarrApiKey);
        const connectionResponse = waitForExternalResponse(
            page,
            "testConnection",
        );
        await page.getByTestId(`${DIALOG}-test`).click();

        const result = (await (await connectionResponse).json()) as {
            successful?: boolean;
        };
        expect(result.successful).toBe(false);
        await expect(page.getByText(/^Connection test failed: /)).toBeVisible();
        await expect(page.getByTestId(DIALOG)).toBeVisible();
    });

    test("should refuse to submit an entry whose connection fails", async ({
        hydra,
        page,
    }) => {
        await openPreset(page, "SONARR");
        await draftField(page, "name").fill("UI System Test Sonarr Refused");
        await draftField(page, "nzbhydraName").fill(
            "UI System Test Sonarr Refused",
        );
        await draftField(page, "host").fill(BROKEN_URL);
        await draftField(page, "apiKey").fill(testEnvironment.sonarrApiKey);
        await draftField(page, "nzbhydraHost").fill(
            testEnvironment.hydraExternalUrl,
        );
        const connectionResponse = waitForExternalResponse(
            page,
            "testConnection",
        );
        await page.getByTestId(`${DIALOG}-submit`).click();

        expect((await connectionResponse).status()).toBe(200);
        await expect(page.getByText(/^Connection test failed: /)).toBeVisible();
        // The dialog stays open, the tool was never configured, and nothing
        // reached the configuration form.
        await expect(page.getByTestId(DIALOG)).toBeVisible();
        await expect(
            page.getByTestId(`config-repeat-entry-${LIST}-0`),
        ).toBeHidden();
        expect(
            externalToolsOf((await hydra.getConfig()) as Json),
            "a refused entry must not reach the configuration",
        ).toEqual([]);
    });

    /**
     * FM-070: a cleared "Minimum seeders" configures the tool with the
     * documented default of 1. Only the torznab branch reads the value, and
     * add type `Single` is the only way to reach it here - every mock indexer
     * the fixture configures is newznab, so a per-indexer torrent sync would
     * have no indexer to write at all.
     *
     * This case passes against the pre-fix jar too, and deliberately so: it
     * pins the *result*, which two independent layers now guarantee. Over HTTP
     * the empty string never even reaches `ExternalTools:266`, because
     * `WebConfiguration`'s mapper deserializes "" to null
     * (`EmptyStringToNullDeserializer`); `parseMinimumSeeders` is what keeps
     * the answer 1 when the same value arrives from the stored configuration
     * instead, which the automatic sync does in Java. The case below is the
     * one that reproduced the defect through the browser.
     */
    test("should configure a torrent entry whose minimum seeders is cleared", async ({
        page,
    }) => {
        const name = "UI System Test Radarr Torrent";
        await openPreset(page, "RADARR");
        await draftField(page, "name").fill(name);
        await draftField(page, "nzbhydraName").fill(name);
        await draftField(page, "host").fill(testEnvironment.radarrInternalUrl);
        await draftField(page, "apiKey").fill(testEnvironment.radarrApiKey);
        await draftField(page, "nzbhydraHost").fill(
            testEnvironment.hydraExternalUrl,
        );
        await chooseDraftOption(
            page,
            "Sync Type",
            "Single entry for all indexers",
        );
        await draftSwitch(page, "Configure for Usenet").setChecked(false);
        await draftSwitch(page, "Configure for Torrents").setChecked(true);
        const minimumSeeders = draftField(page, "minimumSeeders");
        await minimumSeeders.fill("2");
        await minimumSeeders.fill("");
        await expect(minimumSeeders).toHaveValue("");

        const connectionResponse = waitForExternalResponse(
            page,
            "testConnection",
        );
        const configureResponse = waitForExternalResponse(page, "configure");
        await page.getByTestId(`${DIALOG}-submit`).click();
        await expectConnectionSuccess(await connectionResponse);
        const configure = await configureResponse;

        // The cleared field really does leave the browser as an empty string,
        // and it is the torznab branch that received it.
        expect(addRequestOf(configure).minimumSeeders).toBe("");
        expect(addRequestOf(configure).addType).toBe("SINGLE");
        expect(addRequestOf(configure).configureForTorrents).toBe(true);
        expect(addRequestOf(configure).configureForUsenet).toBe(false);
        expect(
            await configure.json(),
            `External-tool configuration failed: ${await externalToolsMessages(page)}`,
        ).toBe(true);
        await expect(
            page.getByTestId(DIALOG),
            await externalToolsMessages(page),
        ).toBeHidden();
        expect(await externalToolsMessages(page)).not.toContain(
            "For input string",
        );

        // What Radarr actually holds now: a torznab entry whose blank
        // "Minimum seeders" became the documented default of 1.
        const created = await getArrIndexerByName(
            page.request,
            testEnvironment.radarrExternalUrl,
            name,
        );
        expect(created.configContract).toBe("TorznabSettings");
        expect(created.protocol).toBe("torrent");
        expect(arrIndexerField(created, "minimumSeeders")).toBe(1);
    });

    /**
     * FM-070, and the case that actually reproduced the defect against the
     * pre-fix jar: `mapCategories` split on "," and parsed each token raw, so
     * the space in "2000, 5000" - the way a list is written by hand, and the
     * shape legacy accepted without comment - threw inside `Integer.parseInt`
     * and made `configure` answer `false` with `Unexpected error: For input
     * string: " 5000"`. A *cleared* "Minimum seeders" cannot reproduce it over
     * HTTP: `WebConfiguration`'s mapper deserializes "" to null
     * (`EmptyStringToNullDeserializer`), so the empty string never reaches
     * `ExternalTools:266`. Only a value that survives deserialization does -
     * this one, a blank one, or a non-numeric one, all of which the JVM tests
     * drive through the sync service's shape.
     */
    test("should configure an entry whose categories carry spacing", async ({
        page,
    }) => {
        const name = "UI System Test Radarr Categories";
        await openPreset(page, "RADARR");
        await draftField(page, "name").fill(name);
        await draftField(page, "nzbhydraName").fill(name);
        await draftField(page, "host").fill(testEnvironment.radarrInternalUrl);
        await draftField(page, "apiKey").fill(testEnvironment.radarrApiKey);
        await draftField(page, "nzbhydraHost").fill(
            testEnvironment.hydraExternalUrl,
        );
        await chooseDraftOption(
            page,
            "Sync Type",
            "Single entry for all indexers",
        );
        await draftField(page, "categories").fill("2000, 5000");

        const connectionResponse = waitForExternalResponse(
            page,
            "testConnection",
        );
        const configureResponse = waitForExternalResponse(page, "configure");
        await page.getByTestId(`${DIALOG}-submit`).click();
        await expectConnectionSuccess(await connectionResponse);
        const configure = await configureResponse;

        expect(addRequestOf(configure).categories).toBe("2000, 5000");
        expect(
            await configure.json(),
            `External-tool configuration failed: ${await externalToolsMessages(page)}`,
        ).toBe(true);
        expect(await externalToolsMessages(page)).not.toContain(
            "For input string",
        );

        const created = await getArrIndexerByName(
            page.request,
            testEnvironment.radarrExternalUrl,
            name,
        );
        expect(arrIndexerField(created, "categories")).toEqual([2000, 5000]);
    });

    test("should trigger manual sync all", async ({hydra, page}) => {
        await syncOnConfigChange(page).setChecked(true);
        await expect(syncOnConfigChange(page)).toBeChecked();
        await addRadarr(page, "UI System Test Radarr Sync");
        await saveConfiguration(page, hydra, "UI System Test Radarr Sync");
        const syncResponse = waitForExternalResponse(page, "syncAll");
        await page.getByTestId("config-external-tools-sync-all").click();

        const syncResult = (await (await syncResponse).json()) as {
            successCount?: number;
            failureCount?: number;
        };
        expect(
            syncResult.failureCount,
            `External-tools sync failed: ${JSON.stringify(syncResult)}`,
        ).toBe(0);
        expect(
            syncResult.successCount,
            `External-tools sync did not configure a tool: ${JSON.stringify(syncResult)}`,
        ).toBeGreaterThan(0);
        await expect(
            page.getByText(
                `Successfully synced to ${syncResult.successCount} external tool(s)`,
            ),
        ).toBeVisible();
        await expectTestOwnedIndexer(
            page.request,
            testEnvironment.radarrExternalUrl,
        );
    });

    test("should toggle sync on config change setting", async ({page}) => {
        const setting = syncOnConfigChange(page);
        const wasChecked = await setting.isChecked();
        await setting.setChecked(!wasChecked);

        await expect(setting).toBeChecked({checked: !wasChecked});
    });

    test("should edit existing external tool", async ({hydra, page}) => {
        await addRadarr(page, "UI System Test Radarr Edit");
        await saveConfiguration(page, hydra, "UI System Test Radarr Edit");
        await page.getByTestId(`config-repeat-edit-${LIST}-0`).click();
        await expect(page.getByTestId(DIALOG)).toBeVisible();
        await expect(page.getByTestId(`${DIALOG}-delete`)).toBeVisible();
        await draftField(page, "name").fill("UI System Test Radarr Edited");
        // Nothing connection-relevant changed, so legacy configures without
        // testing again.
        await submitModal(page, false);
        await saveConfiguration(page, hydra, "UI System Test Radarr Edited");

        await expect(
            page.getByTestId(`config-repeat-entry-${LIST}-0`),
        ).toContainText("UI System Test Radarr Edited");
    });

    test("should delete external tool", async ({hydra, page}) => {
        await addRadarr(page, "UI System Test Radarr Delete");
        await saveConfiguration(page, hydra, "UI System Test Radarr Delete");
        await page.getByTestId(`config-repeat-remove-${LIST}-0`).click();
        await saveConfiguration(page, hydra);

        await expect(
            page.getByTestId(`config-repeat-entry-${LIST}-0`),
        ).toBeHidden();
        await expect(
            page.getByRole("heading", {name: "No external tools configured"}),
        ).toBeVisible();
        expect(externalToolsOf((await hydra.getConfig()) as Json)).toEqual([]);
    });

    test("should persist the complete entry the dialog committed", async ({
        hydra,
        page,
    }) => {
        await addRadarr(page, "UI System Test Radarr Persist");
        await saveConfiguration(page, hydra, "UI System Test Radarr Persist");

        const tools = externalToolsOf((await hydra.getConfig()) as Json);
        expect(tools).toHaveLength(1);
        expect(tools[0]).toMatchObject({
            addDisabledIndexers: false,
            apiKey: testEnvironment.radarrApiKey,
            categories: "2000",
            configureForTorrents: false,
            configureForUsenet: true,
            enableAutomaticSearch: true,
            enableInteractiveSearch: true,
            enableRss: true,
            enabled: true,
            host: testEnvironment.radarrInternalUrl,
            name: "UI System Test Radarr Persist",
            nzbhydraHost: testEnvironment.hydraExternalUrl,
            nzbhydraName: "UI System Test Radarr Persist",
            priority: 25,
            removeYearFromSearchString: false,
            syncType: "PER_INDEXER",
            type: "RADARR",
            useHydraPriorities: true,
        });

        // A full document load proves the entry was persisted rather than only
        // held in the form.
        await page.reload();
        await dismissWelcomeDialog(page);
        await expect(page.getByTestId("config-external-tools")).toBeVisible();
        await expect(
            page.getByTestId(`config-repeat-entry-${LIST}-0`),
        ).toContainText("UI System Test Radarr Persist");
    });
});

test.describe("External tools visual evidence", () => {
    for (const viewport of ["desktop", "mobile"] as const) {
        test(`should capture the External Tools tab states at ${viewport}`, async ({
            hydra,
            page,
        }) => {
            const before = (await hydra.getConfig()) as Json;
            await hydra.saveConfig({
                ...before,
                externalTools: {syncOnConfigChange: false, externalTools: []},
            });

            await prepareVisualEvidence(page, viewport, async () => {
                await openExternalTools(page);
            });
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-EXTERNAL-TOOLS",
                    `external-tools-empty-${viewport}`,
                ),
                fullPage: true,
            });

            await hydra.saveConfig({
                ...before,
                externalTools: {
                    syncOnConfigChange: true,
                    externalTools: [
                        configuredTool(
                            "UI System Test Radarr",
                            "RADARR",
                            testEnvironment.radarrInternalUrl,
                            testEnvironment.radarrApiKey,
                        ),
                        configuredTool(
                            "UI System Test Sonarr",
                            "SONARR",
                            testEnvironment.sonarrInternalUrl,
                            testEnvironment.sonarrApiKey,
                        ),
                    ],
                },
            });
            await prepareVisualEvidence(page, viewport, async () => {
                await page.reload();
                await dismissWelcomeDialog(page);
                await expect(
                    page.getByTestId("config-external-tools"),
                ).toBeVisible();
                await showAdvanced(page);
                await expect(
                    page.getByTestId(`config-repeat-entry-${LIST}-1`),
                ).toBeVisible();
            });
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-EXTERNAL-TOOLS",
                    `external-tools-two-tools-${viewport}`,
                ),
                fullPage: true,
            });

            await page.getByTestId(`config-repeat-edit-${LIST}-0`).click();
            await expect(page.getByTestId(DIALOG)).toBeVisible();
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-EXTERNAL-TOOLS",
                    `external-tools-dialog-${viewport}`,
                ),
                fullPage: true,
            });

            await draftField(page, "host").fill(BROKEN_URL);
            const failedTest = waitForExternalResponse(page, "testConnection");
            await page.getByTestId(`${DIALOG}-test`).click();
            await failedTest;
            await expect(
                page.getByText(/^Connection test failed: /),
            ).toBeVisible();
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-EXTERNAL-TOOLS",
                    `external-tools-connection-failed-${viewport}`,
                ),
            });

            // FM-070: the rejected "Minimum seeders". Nothing is sent, so this
            // state needs no reachable tool - the dialog's own validation stops
            // the submit and names the field.
            await draftSwitch(page, "Configure for Torrents").setChecked(true);
            await draftField(page, "minimumSeeders").fill("abc");
            await page.getByTestId(`${DIALOG}-submit`).click();
            const seedersError = page.getByTestId(
                "config-error-externalTools-externalToolDraft-minimumSeeders",
            );
            await expect(seedersError).toHaveText("abc is not a whole number");
            await seedersError.scrollIntoViewIfNeeded();
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-EXTERNAL-TOOLS",
                    `external-tools-invalid-seeders-${viewport}`,
                ),
            });
        });
    }
});

function externalToolsOf(config: Json): Json[] {
    return ((config.externalTools as Json | undefined)?.externalTools ??
        []) as Json[];
}

function configuredTool(
    name: string,
    type: string,
    host: string,
    apiKey: string,
): Json {
    return {
        addDisabledIndexers: false,
        apiKey,
        categories: type === "RADARR" ? "2000" : "5030,5040",
        configureForTorrents: false,
        configureForUsenet: true,
        enableAutomaticSearch: true,
        enableInteractiveSearch: true,
        enableRss: true,
        enabled: true,
        host,
        name,
        nzbhydraHost: testEnvironment.hydraExternalUrl,
        nzbhydraName: name,
        priority: 25,
        removeYearFromSearchString: false,
        syncType: "PER_INDEXER",
        type,
        useHydraPriorities: true,
    };
}

async function openExternalTools(page: Page): Promise<void> {
    await page.goto("ui/react?redirect=/config/externalTools");
    await dismissWelcomeDialog(page);
    await expect(page.getByTestId("config-shell")).toBeVisible();
    await expect(page.getByTestId("config-external-tools")).toBeVisible();
    await showAdvanced(page);
}

/**
 * Legacy gates several of this tab's fields (categories, the seeding options,
 * the additional parameters) behind the advanced toggle, which is a
 * per-browser `localStorage` preference the `page` fixture clears on every
 * document load — so it has to be switched on again after a reload.
 */
async function showAdvanced(page: Page): Promise<void> {
    const toggle = page.getByRole("switch", {name: "Advanced settings"});
    await toggle.setChecked(true);
    await expect(toggle).toBeChecked();
}

function syncOnConfigChange(page: Page): Locator {
    return page
        .getByTestId("config-setting-externalTools-syncOnConfigChange")
        .getByRole("switch");
}

function addRequestOf(response: Response): Record<string, unknown> {
    return response.request().postDataJSON() as Record<string, unknown>;
}

function draftField(page: Page, field: string): Locator {
    return page.getByTestId(`${DRAFT}-${field}`);
}

function draftSwitch(page: Page, label: string): Locator {
    return page.getByRole("dialog").getByRole("switch", {name: label});
}

/** Picks an option in one of the dialog's MUI selects. */
async function chooseDraftOption(
    page: Page,
    label: string,
    option: string,
): Promise<void> {
    await page.getByRole("dialog").getByRole("combobox", {name: label}).click();
    await page.getByRole("option", {name: option}).click();
}

async function openPreset(page: Page, preset: string): Promise<void> {
    await page.getByTestId(`config-repeat-add-${LIST}`).click();
    await page
        .getByTestId(`config-repeat-add-option-${LIST}-${preset}`)
        .click();
    await expect(page.getByRole("heading", {name: DIALOG_TITLE})).toBeVisible();
}

async function addRadarr(page: Page, name: string): Promise<void> {
    await openPreset(page, "RADARR");
    await draftField(page, "name").fill(name);
    await draftField(page, "nzbhydraName").fill(name);
    await draftField(page, "host").fill(testEnvironment.radarrInternalUrl);
    await draftField(page, "apiKey").fill(testEnvironment.radarrApiKey);
    await draftField(page, "nzbhydraHost").fill(
        testEnvironment.hydraExternalUrl,
    );
    await submitModal(page, true);
    await expect(
        page.getByTestId(`config-repeat-entry-${LIST}-0`),
    ).toContainText(name);
}

async function closeModal(page: Page): Promise<void> {
    await page.getByTestId(`${DIALOG}-cancel`).click();
    await expect(page.getByTestId(DIALOG)).toBeHidden();
}

/**
 * Submits the edit dialog and asserts legacy's order: the connection is tested
 * first when the entry is new or its connection settings changed, and the
 * dialog only closes once `configure` answered `true`.
 */
async function submitModal(
    page: Page,
    expectConnection: boolean,
): Promise<void> {
    const connectionResponse = expectConnection
        ? waitForExternalResponse(page, "testConnection")
        : undefined;
    const configureResponse = waitForExternalResponse(page, "configure");
    await page.getByTestId(`${DIALOG}-submit`).click();
    if (connectionResponse) {
        await expectConnectionSuccess(await connectionResponse);
    }
    const configure = await configureResponse;
    expect(
        await configure.json(),
        `External-tool configuration failed: ${await externalToolsMessages(page)}`,
    ).toBe(true);
    expectCompleteAddRequest(configure);
    expect(addRequestOf(configure).addType).toBe("PER_INDEXER");
    await expect(
        page.getByTestId(DIALOG),
        await externalToolsMessages(page),
    ).toBeHidden();
}

async function saveConfiguration(
    page: Page,
    hydra: {
        getConfig(): Promise<Record<string, unknown>>;
    },
    expectedName?: string,
): Promise<void> {
    const saved = page.waitForResponse(
        (response) =>
            response.request().method() === "PUT" &&
            new URL(response.url()).pathname === "/internalapi/config",
    );
    await page.getByTestId("config-save").click();
    const response = await saved;
    expect(response.status()).toBe(200);
    const result = (await response.json()) as {
        ok?: boolean;
        errorMessages?: string[];
        newConfig?: Record<string, unknown>;
    };
    expect(
        result.ok,
        `Configuration validation errors: ${(result.errorMessages || []).join(", ")}`,
    ).toBe(true);
    expect(result.errorMessages || []).toEqual([]);
    expect(
        result.newConfig,
        "Configuration save did not return the saved configuration",
    ).toBeTruthy();
    await expect(page.getByText("Configuration saved.")).toBeVisible();
    if (expectedName) {
        const persisted = await hydra.getConfig();
        const tools = externalToolsOf(persisted as Json);
        expect(tools.map((tool) => tool.name)).toContain(expectedName);
    }
}

function waitForExternalResponse(
    page: Page,
    operation: string,
): Promise<Response> {
    return page.waitForResponse(
        (response) =>
            response.request().method() === "POST" &&
            new URL(response.url()).pathname ===
                `/internalapi/externalTools/${operation}`,
    );
}

async function expectConnectionSuccess(response: Response): Promise<void> {
    expect(
        response.status(),
        `Connection test failed: ${await response.text()}`,
    ).toBe(200);
    const result = (await response.json()) as {
        successful?: boolean;
        message?: string;
    };
    expect(result.successful, `Connection test failed: ${result.message}`).toBe(
        true,
    );
    expect(result.message).toBe("Connection successful");
}

function expectCompleteAddRequest(response: Response): void {
    const requestBody = addRequestOf(response);
    for (const property of addRequestBooleans) {
        expect(typeof requestBody[property], property).toBe("boolean");
    }
}

async function externalToolsMessages(page: Page): Promise<string> {
    const response = await page.request.get(
        "/internalapi/externalTools/messages",
        {
            params: {internalApiKey: testEnvironment.hydraInternalApiKey},
        },
    );
    return response.ok()
        ? JSON.stringify(await response.json())
        : await response.text();
}

type ArrIndexer = {id: number; name: string};

/** The same entries, read with the parts `expectTestOwnedIndexer` ignores. */
type ArrIndexerDetail = {
    configContract?: string;
    fields?: {name?: string; value?: unknown}[];
    name: string;
    protocol?: string;
};

async function getArrIndexerByName(
    request: APIRequestContext,
    url: string,
    name: string,
): Promise<ArrIndexerDetail> {
    const response = await request.get(`${url}/api/v3/indexer`, {
        headers: {"X-Api-Key": testEnvironment.radarrApiKey},
    });
    expect(
        response.status(),
        `Unable to query external-tool indexers: ${await response.text()}`,
    ).toBe(200);
    const indexers = (await response.json()) as ArrIndexerDetail[];
    const match = indexers.find((indexer) => indexer.name === name);
    expect(
        match,
        `No external-tool indexer named "${name}"; found: ${indexers
            .map((indexer) => indexer.name)
            .join(", ")}`,
    ).toBeTruthy();
    return match as ArrIndexerDetail;
}

function arrIndexerField(indexer: ArrIndexerDetail, field: string): unknown {
    return indexer.fields?.find((candidate) => candidate.name === field)?.value;
}

async function getTestOwnedIndexers(
    request: APIRequestContext,
    url: string,
): Promise<ArrIndexer[]> {
    const response = await request.get(`${url}/api/v3/indexer`, {
        headers: {"X-Api-Key": testEnvironment.radarrApiKey},
    });
    expect(
        response.status(),
        `Unable to query external-tool indexers: ${await response.text()}`,
    ).toBe(200);
    return ((await response.json()) as ArrIndexer[]).filter((indexer) =>
        indexer.name.includes(TEST_TOOL_PREFIX),
    );
}

async function expectTestOwnedIndexer(
    request: APIRequestContext,
    url: string,
): Promise<void> {
    expect(await getTestOwnedIndexers(request, url)).not.toEqual([]);
}

async function deleteTestOwnedIndexers(
    request: APIRequestContext,
    url: string,
): Promise<void> {
    for (const indexer of await getTestOwnedIndexers(request, url)) {
        const response = await request.delete(
            `${url}/api/v3/indexer/${indexer.id}`,
            {
                headers: {"X-Api-Key": testEnvironment.radarrApiKey},
            },
        );
        expect(
            response.status(),
            `Unable to delete test-owned external indexer ${indexer.name}: ${await response.text()}`,
        ).toBe(200);
    }
}
