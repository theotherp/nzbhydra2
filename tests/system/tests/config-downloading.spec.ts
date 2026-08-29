import type {Page} from "@playwright/test";

import {dismissWelcomeDialog, expect, test, testEnvironment} from "./fixtures";
import {prepareVisualEvidence, visualEvidencePath} from "./visualEvidence";

type Json = Record<string, unknown>;

const LIST = "downloading-downloaders";
const DOWNLOADER = {
    apiKey: testEnvironment.sabnzbdMockApiKey,
    category: "systemtest-category",
    name: "System Test SABnzbd",
    url: `${testEnvironment.mockserverInternalUrl}/sabnzbd`,
};
/** Reachable but not a downloader, so the backend's check fails quickly. */
const BROKEN_URL = `${testEnvironment.mockserverInternalUrl}/definitely-not-sabnzbd`;

function downloading(config: Json): Json {
    return config.downloading as Json;
}

function downloadersOf(config: Json): Json[] {
    return (downloading(config).downloaders ?? []) as Json[];
}

function withoutDownloaders(config: Json): Json {
    return {
        ...config,
        downloading: {...downloading(config), downloaders: []},
    };
}

async function openDownloadingConfig(page: Page): Promise<void> {
    await page.goto("/config/downloading");
    await dismissWelcomeDialog(page);
    await expect(page.getByTestId("config-shell")).toBeVisible();
    await expect(page.getByTestId("config-downloading")).toBeVisible();
}

/**
 * The advanced toggle is a per-browser preference in `localStorage`, and the
 * `page` fixture clears storage on every document load — so it has to be
 * switched on again after a reload, not only once per test.
 */
async function showAdvanced(page: Page): Promise<void> {
    // FM-097: below `md` the settings nav is a temporary `Drawer`, so the
    // advanced toggle at its foot is only mounted while that drawer is open
    // (`RefineSidebar.tsx:97-101`: exactly one copy, never a duplicated
    // testid). `config-nav-open` is rendered only below `md`, so this branch
    // is inert at desktop viewports, and the drawer is closed again below so
    // the page is left in exactly the state this helper always left it in.
    const navOpen = page.getByTestId("config-nav-open");
    const inDrawer = await navOpen.isVisible();
    if (inDrawer) {
        await navOpen.click();
        await expect(page.getByTestId("config-nav")).toBeVisible();
    }
    const toggle = page.getByRole("switch", {name: "Advanced settings"});
    await toggle.setChecked(true);
    await expect(toggle).toBeChecked();
    await expect(
        page.getByTestId("config-setting-downloading-nzbAccessType"),
    ).toBeVisible();
    if (inDrawer) {
        await page.keyboard.press("Escape");
        await expect(page.getByTestId("config-nav")).toBeHidden();
    }
}

async function addFromPreset(page: Page, preset: string): Promise<void> {
    await page.getByTestId(`config-repeat-add-${LIST}`).click();
    await page
        .getByTestId(`config-repeat-add-option-${LIST}-${preset}`)
        .click();
    await expect(page.getByTestId("config-downloader-dialog")).toBeVisible();
}

function draftField(page: Page, field: string) {
    return page.getByTestId(
        `config-input-downloading-downloaderDraft-${field}`,
    );
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
    // Anchored to the most recent toast: FM-084 made toasts stack, so a second
    // save leaves two in the DOM and an unanchored locator trips strict mode.
    await expect(page.getByText("Configuration saved.").last()).toBeVisible();
}

/**
 * These specs assert against the configuration, so they establish the one they
 * assert against rather than inheriting whatever the previous test left on the
 * shared instance. See `applyBaseline` in `fixtures.ts` for what it fixes and
 * why it is deliberately narrow.
 */
test.beforeEach(async ({hydra}) => {
    await hydra.applyBaseline();
});

test.describe("Config downloading tab round trip", () => {
    test("should add a checked downloader, save it, and keep its credentials masked across a reload", async ({
        page,
        hydra,
    }) => {
        const before = (await hydra.getConfig()) as Json;
        await hydra.saveConfig(withoutDownloaders(before));

        await openDownloadingConfig(page);
        await showAdvanced(page);
        await expect(
            page.getByTestId(`config-repeat-entry-${LIST}-0`),
        ).toBeHidden();

        // A failed check first: the real backend answers, the dialog explains
        // what failed, and "let me try again" commits nothing.
        await addFromPreset(page, "SABNZBD");
        await draftField(page, "name").fill(DOWNLOADER.name);
        await draftField(page, "url").fill(BROKEN_URL);
        await draftField(page, "apiKey").fill(DOWNLOADER.apiKey);
        const failedCheck = page.waitForResponse(
            (response) =>
                response.request().method() === "POST" &&
                new URL(response.url()).pathname ===
                    "/internalapi/downloader/checkConnection",
        );
        await page.getByTestId("config-downloader-dialog-submit").click();
        expect((await failedCheck).status()).toBe(200);
        const failureDialog = page.getByTestId(
            "config-downloader-connection-failed",
        );
        await expect(failureDialog).toBeVisible();
        await expect(
            failureDialog.getByText("Do you want to add it anyway?"),
        ).toBeVisible();
        await failureDialog
            .getByRole("button", {name: "Aahh, let me try again"})
            .click();
        await expect(failureDialog).toBeHidden();
        await expect(
            page.getByTestId("config-downloader-dialog"),
        ).toBeVisible();
        expect(downloadersOf((await hydra.getConfig()) as Json)).toEqual([]);

        // Correcting the URL makes the same check succeed against the mock.
        await draftField(page, "url").fill(DOWNLOADER.url);
        await draftField(page, "defaultCategory").fill(DOWNLOADER.category);
        const okCheck = page.waitForResponse(
            (response) =>
                response.request().method() === "POST" &&
                new URL(response.url()).pathname ===
                    "/internalapi/downloader/checkConnection",
        );
        await page.getByTestId("config-downloader-dialog-submit").click();
        expect((await okCheck).status()).toBe(200);
        await expect(page.getByTestId("config-downloader-dialog")).toBeHidden();
        await expect(
            page.getByText("Connection to the downloader tested successfully"),
        ).toBeVisible();
        await expect(
            page.getByTestId(`config-repeat-entry-${LIST}-0`),
        ).toContainText(DOWNLOADER.name);

        // Still nothing on disk: the modal transaction only reached the form.
        expect(downloadersOf((await hydra.getConfig()) as Json)).toEqual([]);

        await save(page);

        // A full document load proves the entry was persisted rather than only
        // held in the form.
        await page.reload();
        await dismissWelcomeDialog(page);
        await expect(page.getByTestId("config-downloading")).toBeVisible();
        await showAdvanced(page);
        await expect(
            page.getByTestId(`config-repeat-entry-${LIST}-0`),
        ).toContainText(DOWNLOADER.name);
        await expect(
            page.getByTestId("config-downloader-value-0-url"),
        ).toHaveText(DOWNLOADER.url);

        // The API key comes back masked, and the secret control shows that as
        // an empty field with its unchanged placeholder — never as the marker.
        await page.getByTestId(`config-repeat-edit-${LIST}-0`).click();
        await expect(
            page.getByTestId("config-downloader-dialog"),
        ).toBeVisible();
        await expect(draftField(page, "apiKey")).toHaveValue("");
        await expect(draftField(page, "apiKey")).toHaveAttribute(
            "placeholder",
            "Value unchanged",
        );
        await page.getByTestId("config-downloader-dialog-cancel").click();

        const after = (await hydra.getConfig()) as Json;
        const downloaders = downloadersOf(after);
        expect(downloaders).toHaveLength(1);
        expect(downloaders[0]).toMatchObject({
            addPaused: false,
            defaultCategory: DOWNLOADER.category,
            downloaderType: "SABNZBD",
            enabled: true,
            name: DOWNLOADER.name,
            nzbAddingType: "UPLOAD",
            url: DOWNLOADER.url,
        });
        expect(downloaders[0].apiKey).toBe("***UNCHANGED***");
        // Legacy's preset seeds a key `DownloaderConfig` has no field for; the
        // backend drops it rather than rejecting the save.
        expect(downloaders[0].nzbAccessType).toBeUndefined();
    });

    test("should discard a cancelled downloader edit and delete an entry", async ({
        page,
        hydra,
    }) => {
        const before = (await hydra.getConfig()) as Json;
        await hydra.saveConfig({
            ...before,
            downloading: {
                ...downloading(before),
                downloaders: [
                    {
                        addPaused: false,
                        apiKey: DOWNLOADER.apiKey,
                        downloadType: "NZB",
                        downloaderType: "SABNZBD",
                        enabled: true,
                        name: DOWNLOADER.name,
                        nzbAddingType: "UPLOAD",
                        url: DOWNLOADER.url,
                    },
                ],
            },
        });

        await openDownloadingConfig(page);
        await showAdvanced(page);

        // Cancel discards: the entry keeps the name it was saved with.
        await page.getByTestId(`config-repeat-edit-${LIST}-0`).click();
        await draftField(page, "name").fill("Renamed but cancelled");
        await page.getByTestId("config-downloader-dialog-cancel").click();
        await expect(page.getByTestId("config-downloader-dialog")).toBeHidden();
        await expect(
            page.getByTestId(`config-repeat-entry-${LIST}-0`),
        ).toContainText(DOWNLOADER.name);

        // Delete removes it from the form; saving persists the removal.
        await page.getByTestId(`config-repeat-edit-${LIST}-0`).click();
        await page.getByTestId("config-downloader-dialog-delete").click();
        await expect(page.getByTestId("config-downloader-dialog")).toBeHidden();
        await expect(
            page.getByTestId(`config-repeat-entry-${LIST}-0`),
        ).toBeHidden();

        await save(page);
        expect(downloadersOf((await hydra.getConfig()) as Json)).toEqual([]);
    });
});

test.describe("Config downloading tab visual evidence", () => {
    for (const viewport of ["desktop", "mobile"] as const) {
        test(`should capture the Downloading tab states at ${viewport}`, async ({
            page,
            hydra,
        }) => {
            const before = (await hydra.getConfig()) as Json;
            await hydra.saveConfig(withoutDownloaders(before));

            await prepareVisualEvidence(page, viewport, async () => {
                await openDownloadingConfig(page);
                await showAdvanced(page);
            });
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-DOWNLOADING",
                    `downloading-no-downloader-${viewport}`,
                ),
                fullPage: true,
            });

            await page.getByTestId(`config-repeat-add-${LIST}`).click();
            await expect(
                page.getByTestId(`config-repeat-add-option-${LIST}-SABNZBD`),
            ).toBeVisible();
            // Not `fullPage`: the menu is anchored in the viewport.
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-DOWNLOADING",
                    `downloading-preset-menu-${viewport}`,
                ),
            });
            await page.keyboard.press("Escape");

            // Three saved downloaders, so the strip shows a populated table,
            // the primary-downloader select the footer switch reveals, and
            // — FM-118 — a Torbox row, whose URL column has no value to show
            // (`visibleDownloaderFields`/its preset seed carry no `url` key at
            // all) and must read as an explicit empty state rather than a
            // blank cell or the string "undefined".
            await hydra.saveConfig({
                ...before,
                downloading: {
                    ...downloading(before),
                    downloaders: [
                        {
                            addPaused: false,
                            apiKey: DOWNLOADER.apiKey,
                            downloadType: "NZB",
                            downloaderType: "SABNZBD",
                            enabled: true,
                            name: DOWNLOADER.name,
                            nzbAddingType: "UPLOAD",
                            url: DOWNLOADER.url,
                        },
                        {
                            addPaused: false,
                            downloadType: "NZB",
                            downloaderType: "NZBGET",
                            enabled: true,
                            name: "System Test NZBGet",
                            nzbAddingType: "SEND_LINK",
                            url: "http://localhost:6789",
                        },
                        {
                            addPaused: false,
                            defaultCategory: "Use no category",
                            downloadType: "NZB",
                            downloaderType: "TORBOX",
                            enabled: true,
                            name: "System Test Torbox",
                            nzbAddingType: "UPLOAD",
                        },
                    ],
                    showDownloaderStatus: true,
                },
            });
            await prepareVisualEvidence(page, viewport, async () => {
                await page.reload();
                await dismissWelcomeDialog(page);
                await expect(
                    page.getByTestId("config-downloading"),
                ).toBeVisible();
                await showAdvanced(page);
                await expect(
                    page.getByTestId(`config-repeat-entry-${LIST}-2`),
                ).toBeVisible();
            });
            await expect(
                page.getByTestId("config-downloader-value-2-url"),
            ).not.toHaveText(/undefined/);
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-DOWNLOADING",
                    `downloading-three-downloaders-${viewport}`,
                ),
                fullPage: true,
            });

            await page.getByTestId(`config-repeat-edit-${LIST}-0`).click();
            await expect(
                page.getByTestId("config-downloader-dialog"),
            ).toBeVisible();
            await draftField(page, "url").fill(BROKEN_URL);
            await page.getByTestId("config-downloader-dialog-submit").click();
            await expect(
                page.getByTestId("config-downloader-connection-failed"),
            ).toBeVisible();
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-DOWNLOADING",
                    `downloading-connection-failed-${viewport}`,
                ),
            });
        });
    }
});
