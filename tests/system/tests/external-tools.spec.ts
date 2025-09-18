import {expect, test} from "@playwright/test";

test.describe("External Tools Configuration", () => {
    test.beforeEach(async ({page}) => {
        // Navigate to the config page
        await page.goto("/");
        // Wait for the page to load
        await page.waitForLoadState("networkidle");
    });

    test("should display External Tools tab in configuration", async ({page}) => {
        // Navigate to config page
        await page.click("a[href=\"/config/main\"]");
        await page.waitForSelector(".nav-tabs");

        // Check that External Tools tab exists
        await expect(page.locator(".nav-tabs").locator("text=External Tools")).toBeVisible();
    });

    test("should navigate to External Tools configuration", async ({page}) => {
        // Navigate to External Tools config
        await page.goto("/config/externalTools");
        await page.waitForLoadState("networkidle");

        // Check that the sync settings are visible
        await expect(page.locator(".bootstrap-switch-id-formly_1_horizontalSwitch_syncOnConfigChange_0")).toBeVisible();

        // Check that the "Add external tool" button is present
        await expect(page.locator("button:has-text(\"Add external tool\")")).toBeVisible();
    });

    test("should show empty state when no external tools configured", async ({page}) => {
        await page.goto("/config/externalTools");
        await page.waitForSelector(".form-horizontal");

        // Check that empty state message is shown
        await expect(page.locator("text=No external tools configured")).toBeVisible();
    });

    test("should open external tool configuration modal with presets", async ({page}) => {
        await page.goto("/config/externalTools");
        await page.waitForSelector("button:has-text(\"Add external tool\")");

        // Click the dropdown button
        await page.click("button:has-text(\"Add external tool\")");

        // Check that preset options are available in the dropdown menu
        await expect(page.locator(".dropdown-menu a[ng-click=\"addEntry(model.externalTools, preset)\"]:has-text(\"Sonarr\")")).toBeVisible();
        await expect(page.locator(".dropdown-menu a[ng-click=\"addEntry(model.externalTools, preset)\"]:has-text(\"Radarr\")")).toBeVisible();
        await expect(page.locator(".dropdown-menu a[ng-click=\"addEntry(model.externalTools, preset)\"]:has-text(\"Lidarr\")")).toBeVisible();
        await expect(page.locator(".dropdown-menu a[ng-click=\"addEntry(model.externalTools, preset)\"]:has-text(\"Readarr\")")).toBeVisible();
        await expect(page.locator(".dropdown-menu a[ng-click=\"addEntry(model.externalTools)\"]:has-text(\"Custom\")")).toBeVisible();
    });

    test("should open Sonarr preset configuration modal", async ({page}) => {
        await page.goto("/config/externalTools");
        await page.waitForSelector("button:has-text(\"Add external tool\")");

        // Click dropdown and select Sonarr
        await page.click("button:has-text(\"Add external tool\")");
        await page.click(".dropdown-menu a[ng-click=\"addEntry(model.externalTools, preset)\"]:has-text(\"Sonarr\")");

        // Wait for modal to open
        await page.waitForSelector(".modal-title:has-text(\"External Tool Configuration\")");

        // Check that the modal is opened with Sonarr preset values
        await expect(page.locator(".modal-title")).toContainText("External Tool Configuration");
        await expect(page.locator("input[id*=\"name\"]")).toHaveValue("Sonarr");
        await expect(page.locator("input[id*=\"host\"]")).toHaveValue("http://localhost:8989");
        await expect(page.locator("input[id*=\"categories\"]")).toHaveValue("5030,5040");

        // Check that switches are in correct state
        await expect(page.locator("input[id*=\"enabled\"]")).toBeChecked();
        await expect(page.locator("input[id*=\"configureForUsenet\"]")).toBeChecked();
        await expect(page.locator("input[id*=\"enableRss\"]")).toBeChecked();
        await expect(page.locator("input[id*=\"enableAutomaticSearch\"]")).toBeChecked();
        await expect(page.locator("input[id*=\"enableInteractiveSearch\"]")).toBeChecked();

        // Close modal
        await page.click("button:has-text(\"Cancel\")");
    });

    test("should validate required fields in external tool configuration", async ({page}) => {
        await page.goto("/config/externalTools");
        await page.waitForSelector("button:has-text(\"Add external tool\")");

        // Open custom configuration
        await page.click("button:has-text(\"Add external tool\")");
        await page.click("a:has-text(\"Custom\")");

        // Wait for modal
        await page.waitForSelector(".modal-title:has-text(\"External Tool Configuration\")");

        // Clear required fields
        await page.fill("input[id*=\"name\"]", "");
        await page.fill("input[id*=\"host\"]", "");

        // Try to submit
        await page.click("button:has-text(\"OK\")");

        // Check that validation errors are shown
        await expect(page.locator(".has-error").first()).toBeVisible();

        // Close modal
        await page.click("button:has-text(\"Cancel\")");
    });

    test("should save external tool configuration", async ({page}) => {
        await page.goto("/config/externalTools");
        await page.waitForSelector("button:has-text(\"Add external tool\")");

        // Open Radarr preset
        await page.click("button:has-text(\"Add external tool\")");
        await page.click(".dropdown-menu a[ng-click=\"addEntry(model.externalTools, preset)\"]:has-text(\"Radarr\")");

        // Wait for modal
        await page.waitForSelector(".modal-title:has-text(\"External Tool Configuration\")");

        // Fill in API key
        await page.fill("input[id*=\"apiKey\"]", "766c3461d6fe44cf83cea3e3c16b5428");

        // Submit form
        await page.click("button:has-text(\"OK\")");

        // Wait for modal to close and tool to appear in list
        await page.waitForSelector(".btn:has-text(\"Radarr (RADARR)\")");

        // Wait for the form to stabilize before saving
        await page.waitForTimeout(1000);

        // Save the configuration to persist the changes
        await page.click("button:has-text(\"Save\")", {force: true});

        // Check that the tool appears in the list
        await expect(page.locator(".btn:has-text(\"Radarr (RADARR)\")")).toBeVisible();
        await expect(page.locator("text=http://localhost:7878")).toBeVisible();

        // Check that delete button is present
        await expect(page.locator(".btn-danger .glyphicon-remove")).toBeVisible();
    });

    test("should test connection to external tool", async ({page}) => {
        await page.goto("/config/externalTools");
        await page.waitForSelector("button:has-text(\"Add external tool\")");

        // Open Sonarr preset
        await page.click("button:has-text(\"Add external tool\")");
        await page.click(".dropdown-menu a[ng-click=\"addEntry(model.externalTools, preset)\"]:has-text(\"Sonarr\")");

        // Wait for modal
        await page.waitForSelector(".modal-title:has-text(\"External Tool Configuration\")");

        // Fill in API key
        await page.fill("input[id*=\"apiKey\"]", "52a631c9cab346bca59c32bfffdd2669");

        // Click test connection button
        await page.click("button:has-text(\"Test connection\")");

        // Wait for response (should show error since we're not actually running Sonarr)
        await page.waitForSelector(".growl-message", {timeout: 10000});

        // Close modal
        await page.click("button:has-text(\"Cancel\")");
    });

    test("should trigger manual sync all", async ({page}) => {
        await page.goto("/config/externalTools");
        await page.waitForSelector("button:has-text(\"Sync All Now\")");

        // Click sync all button
        await page.click("button:has-text(\"Sync All Now\")");

        // Wait for notification (should show some message about sync)
        await page.waitForSelector(".growl-message", {timeout: 5000});

        // Should show a message about syncing (even if no tools configured)
        await expect(page.locator(".growl-message").first()).toBeVisible();
    });

    test("should toggle sync on config change setting", async ({page}) => {
        await page.goto("/config/externalTools");
        await page.waitForSelector(".bootstrap-switch-id-formly_1_horizontalSwitch_syncOnConfigChange_0");

        // Get current state from the hidden checkbox
        const isChecked = await page.locator("input#formly_1_horizontalSwitch_syncOnConfigChange_0").isChecked();

        // Toggle by clicking the bootstrap switch wrapper
        await page.click(".bootstrap-switch-id-formly_1_horizontalSwitch_syncOnConfigChange_0");

        // Verify state changed
        const newState = await page.locator("input#formly_1_horizontalSwitch_syncOnConfigChange_0").isChecked();
        expect(newState).toBe(!isChecked);
    });

    test("should edit existing external tool", async ({page}) => {
        // First add a tool
        await page.goto("/config/externalTools");
        await page.waitForSelector("button:has-text(\"Add external tool\")");

        await page.click("button:has-text(\"Add external tool\")");
        await page.click(".dropdown-menu a[ng-click=\"addEntry(model.externalTools, preset)\"]:has-text(\"Radarr\")");
        await page.waitForSelector(".modal-title:has-text(\"External Tool Configuration\")");
        await page.fill("input[id*=\"apiKey\"]", "766c3461d6fe44cf83cea3e3c16b5428");
        await page.click("button:has-text(\"OK\")");

        // Wait for tool to appear
        await page.waitForSelector(".btn:has-text(\"Radarr (RADARR)\")");

        // Save the configuration first
        await page.click("button:has-text(\"Save\")", {force: true});

        // Click on the tool to edit it
        await page.click(".btn:has-text(\"Radarr (RADARR)\")");

        // Wait for modal to open in edit mode
        await page.waitForSelector(".modal-title:has-text(\"External Tool Configuration\")");

        // Check that delete button is present (indicates edit mode)
        await expect(page.locator("button:has-text(\"Delete\")")).toBeVisible();

        // Modify the name
        await page.fill("input[id*=\"name\"]", "My Radarr Instance");

        // Save changes
        await page.click("button:has-text(\"OK\")");

        // Save the configuration again
        await page.click("button:has-text(\"Save\")", {force: true});

        // Verify the name changed
        await page.waitForSelector(".btn:has-text(\"My Radarr Instance (RADARR)\")");
        await expect(page.locator(".btn:has-text(\"My Radarr Instance (RADARR)\")")).toBeVisible();
    });

    test("should delete external tool", async ({page}) => {
        // First add a tool
        await page.goto("/config/externalTools");
        await page.waitForSelector("button:has-text(\"Add external tool\")");

        await page.click("button:has-text(\"Add external tool\")");
        await page.click(".dropdown-menu a[ng-click=\"addEntry(model.externalTools, preset)\"]:has-text(\"Radarr\")");
        await page.waitForSelector(".modal-title:has-text(\"External Tool Configuration\")");
        await page.fill("input[id*=\"apiKey\"]", "766c3461d6fe44cf83cea3e3c16b5428");
        await page.click("button:has-text(\"OK\")");

        // Wait for tool to appear
        await page.waitForSelector(".btn:has-text(\"Radarr (RADARR)\")");

        // Save the configuration first
        await page.click("button:has-text(\"Save\")", {force: true});

        // Wait for save to complete
        await page.waitForTimeout(2000);

        // Click delete button
        await page.click(".btn-danger .glyphicon-remove", {force: true});

        // Save the configuration after deletion
        await page.click("button:has-text(\"Save\")", {force: true});

        // Verify tool is removed from list
        await expect(page.locator(".btn:has-text(\"Radarr (RADARR)\")")).not.toBeVisible();
        await expect(page.locator("text=No external tools configured")).toBeVisible();
    });
});