import {APIRequestContext, Locator, Page, Response} from "@playwright/test";
import {dismissWelcomeDialog, expect, test, testEnvironment} from "./fixtures";

const TEST_TOOL_PREFIX = "UI System Test";

test.describe("External Tools Configuration", () => {
    test.beforeEach(async ({page, hydra}) => {
        await hydra.configureMockIndexers(["1", "2", "3"]);
        await hydra.assertUniqueIndexerCredentials();
        const config = await hydra.getConfig();
        config.externalTools = {syncOnConfigChange: false, externalTools: []};
        await hydra.saveConfig(config);
        await page.goto("/config/externalTools");
        await dismissWelcomeDialog(page);
        await expect(page.getByRole("button", {name: /Add external tool/})).toBeVisible();
    });

    test.afterEach(async ({request}) => {
        const results = await Promise.allSettled([
            deleteTestOwnedIndexers(request, testEnvironment.sonarrExternalUrl),
            deleteTestOwnedIndexers(request, testEnvironment.radarrExternalUrl),
        ]);
        const failures = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
        expect(failures.map(failure => String(failure.reason)), "External-tool cleanup failures").toEqual([]);
    });

    test("should display External Tools tab in configuration", async ({page}) => {
        await page.goto("/config/main");

        await expect(page.locator(".nav-tabs a").filter({hasText: "External Tools"})).toBeVisible();
    });

    test("should navigate to External Tools configuration", async ({page}) => {
        await expect(configurationSwitchGroup(page, "Sync on config change")).toBeVisible();
        await expect(page.getByRole("button", {name: /Add external tool/})).toBeVisible();
    });

    test("should show empty state when no external tools configured", async ({page}) => {
        await expect(page.getByRole("heading", {name: "No external tools configured"})).toBeVisible();
    });

    test("should open external tool configuration modal with presets", async ({page}) => {
        await page.getByRole("button", {name: /Add external tool/}).click();

        for (const preset of ["Sonarr", "Radarr", "Lidarr", "Readarr", "Custom"]) {
            await expect(page.locator(".dropdown-menu li").filter({hasText: preset})).toBeVisible();
        }
    });

    test("should open Sonarr preset configuration modal", async ({page}) => {
        await openPreset(page, "Sonarr");

        await expect(page.getByRole("heading", {name: "External Tool Configuration"})).toBeVisible();
        await expect(modalField(page, "Name")).toHaveValue("Sonarr");
        await expect(modalField(page, "Host URL")).toHaveValue("http://localhost:8989");
        await expect(modalField(page, "Categories")).toHaveValue("5030,5040");
        await expect(modalSwitch(page, "Enabled")).toBeChecked();
        await expect(modalSwitch(page, "Configure for Usenet")).toBeChecked();
        await expect(modalSwitch(page, "Enable RSS")).toBeChecked();
        await expect(modalSwitch(page, "Enable automatic search")).toBeChecked();
        await expect(modalSwitch(page, "Enable interactive search")).toBeChecked();

        await closeModal(page);
    });

    test("should validate required fields in external tool configuration", async ({page}) => {
        await openPreset(page, "Custom");
        await modalField(page, "Name").fill("");
        await modalField(page, "Host URL").fill("");
        await modalOkButton(page).click();

        await expect(page.locator(".has-error").first()).toBeVisible();
        await closeModal(page);
    });

    test("should save external tool configuration", async ({hydra, page}) => {
        await addRadarr(page, "UI System Test Radarr Save");
        await saveConfiguration(page, hydra, "UI System Test Radarr Save");

        await expect(page.getByRole("button", {name: "UI System Test Radarr Save", exact: true})).toBeVisible();
        await expect(page.getByText(testEnvironment.radarrInternalUrl, {exact: true})).toBeVisible();
        await expect(page.locator(".btn-danger .glyphicon-remove")).toBeVisible();
    });

    test("should test connection to external tool", async ({page}) => {
        await openPreset(page, "Sonarr");
        await modalField(page, "Host URL").fill(testEnvironment.sonarrInternalUrl);
        await modalField(page, "API Key").fill(testEnvironment.sonarrApiKey);
        const connectionResponse = waitForExternalResponse(page, "testConnection");
        await page.getByRole("button", {name: "Test connection"}).click();

        await expectConnectionSuccess(await connectionResponse);
        await expect(page.locator(".growl-message").filter({hasText: "Connection test successful"})).toBeVisible();
        await closeModal(page);
    });

    test("should trigger manual sync all", async ({hydra, page}) => {
        await addRadarr(page, "UI System Test Radarr Sync");
        await saveConfiguration(page, hydra, "UI System Test Radarr Sync");
        const syncResponse = waitForExternalResponse(page, "syncAll");
        await page.getByRole("button", {name: /Sync all now/i}).click();

        const syncResult = await (await syncResponse).json() as { successCount?: number; failureCount?: number };
        expect(syncResult.failureCount, `External-tools sync failed: ${JSON.stringify(syncResult)}`).toBe(0);
        expect(syncResult.successCount, `External-tools sync did not configure a tool: ${JSON.stringify(syncResult)}`).toBeGreaterThan(0);
        await expect(page.locator(".growl-message").filter({hasText: "Successfully synced to"})).toBeVisible();
        await expectTestOwnedIndexer(page.request, testEnvironment.radarrExternalUrl);
    });

    test("should toggle sync on config change setting", async ({page}) => {
        const setting = configurationSwitch(page, "Sync on config change");
        const wasChecked = await setting.isChecked();
        await setting.locator("xpath=ancestor::*[contains(@class, 'bootstrap-switch')][1]").click();

        await expect(setting).toBeChecked({checked: !wasChecked});
    });

    test("should edit existing external tool", async ({hydra, page}) => {
        await addRadarr(page, "UI System Test Radarr Edit");
        await saveConfiguration(page, hydra, "UI System Test Radarr Edit");
        await page.getByRole("button", {name: "UI System Test Radarr Edit", exact: true}).click();
        await expect(page.getByRole("button", {name: "Delete", exact: true})).toBeVisible();
        await modalField(page, "Name").fill("UI System Test Radarr Edited");
        await submitModal(page, false);
        await expect(page.getByRole("heading", {name: "External Tool Configuration"})).toBeHidden();
        await saveConfiguration(page, hydra, "UI System Test Radarr Edited");

        await expect(page.getByRole("button", {name: "UI System Test Radarr Edited", exact: true})).toBeVisible();
    });

    test("should delete external tool", async ({hydra, page}) => {
        await addRadarr(page, "UI System Test Radarr Delete");
        await saveConfiguration(page, hydra, "UI System Test Radarr Delete");
        await page.locator(".btn-danger .glyphicon-remove").click();
        await saveConfiguration(page, hydra);

        await expect(page.getByRole("button", {name: "UI System Test Radarr Delete", exact: true})).toBeHidden();
        await expect(page.getByRole("heading", {name: "No external tools configured"})).toBeVisible();
    });
});

async function openPreset(page: Page, preset: string): Promise<void> {
    await page.getByRole("button", {name: /Add external tool/}).click();
    await page.locator(".dropdown-menu li").filter({hasText: preset}).click();
    await expect(page.getByRole("heading", {name: "External Tool Configuration"})).toBeVisible();
}

async function addRadarr(page: Page, name: string): Promise<void> {
    await openPreset(page, "Radarr");
    await modalField(page, "Name").fill(name);
    await modalField(page, "Host URL").fill(testEnvironment.radarrInternalUrl);
    await modalField(page, "API Key").fill(testEnvironment.radarrApiKey);
    await modalField(page, "NZBHydra Host").fill(testEnvironment.hydraExternalUrl);
    await submitModal(page, true);
    await expect(page.getByRole("heading", {name: "External Tool Configuration"})).toBeHidden();
    await expect(page.getByRole("button", {name, exact: true})).toBeVisible();
}

async function closeModal(page: Page): Promise<void> {
    await page.getByRole("button", {name: "Cancel", exact: true}).click();
    await expect(page.getByRole("heading", {name: "External Tool Configuration"})).toBeHidden();
}

async function saveConfiguration(page: Page, hydra: {
    getConfig(): Promise<Record<string, unknown>>
}, expectedName?: string): Promise<void> {
    await page.locator("form").first().evaluate(form => form.addEventListener("submit", event => event.preventDefault()));
    const saveResponse = page.waitForResponse(response =>
        response.request().method() === "PUT" && new URL(response.url()).pathname === "/internalapi/config");
    const saveButton = page.getByRole("button", {name: "Save", exact: true});
    await saveButton.click({force: true});
    const response = await saveResponse;
    expect(response.status(), `Configuration save failed: ${await response.text()}`).toBe(200);
    const result = await response.json() as { ok?: boolean; errorMessages?: string[]; newConfig?: Record<string, unknown> };
    expect(result.ok, `Configuration validation errors: ${(result.errorMessages || []).join(", ")}`).toBe(true);
    expect(result.errorMessages || []).toEqual([]);
    expect(result.newConfig, "Configuration save did not return the saved configuration").toBeTruthy();
    if (expectedName) {
        const persisted = await hydra.getConfig();
        const tools = (persisted.externalTools as { externalTools?: Array<{ name?: string }> }).externalTools || [];
        expect(tools.map(tool => tool.name)).toContain(expectedName);
    }
}

async function submitModal(page: Page, expectConnection: boolean): Promise<void> {
    const connectionResponse = expectConnection ? waitForExternalResponse(page, "testConnection") : undefined;
    const configureResponse = waitForExternalResponse(page, "configure");
    await modalOkButton(page).click();
    if (connectionResponse) {
        await expectConnectionSuccess(await connectionResponse);
    }
    const configure = await configureResponse;
    expect(await configure.json(), `External-tool configuration failed: ${await externalToolsMessages(page)}`).toBe(true);
    await expect(page.getByRole("heading", {name: "External Tool Configuration"}), await externalToolsMessages(page)).toBeHidden();
}

function waitForExternalResponse(page: Page, operation: string): Promise<Response> {
    return page.waitForResponse(response =>
        response.request().method() === "POST"
        && new URL(response.url()).pathname === `/internalapi/externalTools/${operation}`);
}

async function expectConnectionSuccess(response: Response): Promise<void> {
    expect(response.status(), `Connection test failed: ${await response.text()}`).toBe(200);
    const result = await response.json() as { successful?: boolean; message?: string };
    expect(result.successful, `Connection test failed: ${result.message}`).toBe(true);
    expect(result.message).toBe("Connection successful");
}

async function externalToolsMessages(page: Page): Promise<string> {
    const response = await page.request.get("/internalapi/externalTools/messages", {
        params: {internalApiKey: testEnvironment.hydraInternalApiKey},
    });
    return response.ok() ? JSON.stringify(await response.json()) : await response.text();
}

type ArrIndexer = { id: number; name: string };

async function getTestOwnedIndexers(request: APIRequestContext, url: string): Promise<ArrIndexer[]> {
    const response = await request.get(`${url}/api/v3/indexer`, {headers: {"X-Api-Key": testEnvironment.radarrApiKey}});
    expect(response.status(), `Unable to query external-tool indexers: ${await response.text()}`).toBe(200);
    return (await response.json() as ArrIndexer[]).filter(indexer => indexer.name.includes(TEST_TOOL_PREFIX));
}

async function expectTestOwnedIndexer(request: APIRequestContext, url: string): Promise<void> {
    expect(await getTestOwnedIndexers(request, url)).not.toEqual([]);
}

async function deleteTestOwnedIndexers(request: APIRequestContext, url: string): Promise<void> {
    for (const indexer of await getTestOwnedIndexers(request, url)) {
        const response = await request.delete(`${url}/api/v3/indexer/${indexer.id}`, {
            headers: {"X-Api-Key": testEnvironment.radarrApiKey},
        });
        expect(response.status(), `Unable to delete test-owned external indexer ${indexer.name}: ${await response.text()}`)
            .toBe(200);
    }
}

function modalField(page: Page, label: string): Locator {
    return page.getByRole("dialog").locator(".form-group")
        .filter({hasText: new RegExp(escapeRegExp(label))})
        .locator("input, select").first();
}

function modalOkButton(page: Page): Locator {
    return page.getByRole("dialog").getByRole("button", {name: /OK$/});
}

function modalSwitch(page: Page, label: string): Locator {
    return modalField(page, label);
}

function configurationSwitch(page: Page, label: string): Locator {
    return configurationSwitchGroup(page, label).locator("input[type=checkbox]").first();
}

function configurationSwitchGroup(page: Page, label: string): Locator {
    return page.locator(".form-group").filter({hasText: new RegExp(escapeRegExp(label))}).first();
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
