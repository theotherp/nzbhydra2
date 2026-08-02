import {Locator, Page} from "@playwright/test";
import {dismissWelcomeDialog, expect, test} from "./fixtures";

test.describe("External Tools Configuration", () => {
    test.beforeEach(async ({page, hydra}) => {
        const config = await hydra.getConfig();
        config.externalTools = {syncOnConfigChange: false, externalTools: []};
        await hydra.saveConfig(config);
        await page.goto("/config/externalTools");
        await dismissWelcomeDialog(page);
        await expect(page.getByRole("button", {name: /Add external tool/})).toBeVisible();
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

    test("should save external tool configuration", async ({page}) => {
        await addRadarr(page);
        await saveConfiguration(page);

        await expect(page.getByRole("button", {name: "Radarr (RADARR)"})).toBeVisible();
        await expect(page.getByText("http://radarr:7878", {exact: true})).toBeVisible();
        await expect(page.locator(".btn-danger .glyphicon-remove")).toBeVisible();
    });

    test("should test connection to external tool", async ({page}) => {
        await openPreset(page, "Sonarr");
        await modalField(page, "API Key").fill("52a631c9cab346bca59c32bfffdd2669");
        await page.getByRole("button", {name: "Test connection"}).click();

        await expect(page.locator(".growl-message").first()).toBeVisible();
        await closeModal(page);
    });

    test("should trigger manual sync all", async ({page}) => {
        await page.getByRole("button", {name: /Sync all now/i}).click();

        await expect(page.locator(".growl-message").first()).toBeVisible();
    });

    test("should toggle sync on config change setting", async ({page}) => {
        const setting = configurationSwitch(page, "Sync on config change");
        const wasChecked = await setting.isChecked();
        await setting.locator("xpath=ancestor::*[contains(@class, 'bootstrap-switch')][1]").click();

        await expect(setting).toBeChecked({checked: !wasChecked});
    });

    test("should edit existing external tool", async ({page}) => {
        await addRadarr(page);
        await saveConfiguration(page);
        await page.getByRole("button", {name: "Radarr (RADARR)"}).click();
        await expect(page.getByRole("button", {name: "Delete", exact: true})).toBeVisible();
        await modalField(page, "Name").fill("My Radarr Instance");
        await page.getByRole("button", {name: "OK", exact: true}).click();
        await expect(page.getByRole("heading", {name: "External Tool Configuration"})).toBeHidden();
        await saveConfiguration(page);

        await expect(page.getByRole("button", {name: "My Radarr Instance (RADARR)"})).toBeVisible();
    });

    test("should delete external tool", async ({page}) => {
        await addRadarr(page);
        await saveConfiguration(page);
        await page.locator(".btn-danger .glyphicon-remove").click();
        await saveConfiguration(page);

        await expect(page.getByRole("button", {name: "Radarr (RADARR)"})).toBeHidden();
        await expect(page.getByRole("heading", {name: "No external tools configured"})).toBeVisible();
    });
});

async function openPreset(page: Page, preset: string): Promise<void> {
    await page.getByRole("button", {name: /Add external tool/}).click();
    await page.locator(".dropdown-menu li").filter({hasText: preset}).click();
    await expect(page.getByRole("heading", {name: "External Tool Configuration"})).toBeVisible();
}

async function addRadarr(page: Page): Promise<void> {
    await openPreset(page, "Radarr");
    await modalField(page, "Host URL").fill("http://radarr:7878");
    await modalField(page, "API Key").fill("system-test-api-key-12345");
    await modalOkButton(page).click();
    await expect(page.getByRole("heading", {name: "External Tool Configuration"})).toBeHidden();
    await expect(page.getByRole("button", {name: "Radarr (RADARR)"})).toBeVisible();
}

async function closeModal(page: Page): Promise<void> {
    await page.getByRole("button", {name: "Cancel", exact: true}).click();
    await expect(page.getByRole("heading", {name: "External Tool Configuration"})).toBeHidden();
}

async function saveConfiguration(page: Page): Promise<void> {
    const saveResponse = page.waitForResponse(response =>
        response.request().method() === "PUT" && new URL(response.url()).pathname === "/internalapi/config");
    await page.getByRole("button", {name: "Save", exact: true}).click();
    expect((await saveResponse).status()).toBe(200);
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
