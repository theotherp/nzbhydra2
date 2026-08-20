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
});
