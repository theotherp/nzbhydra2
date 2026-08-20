import type {Page} from "@playwright/test";

import {dismissWelcomeDialog, expect, test} from "./fixtures";
import {prepareVisualEvidence, visualEvidencePath} from "./visualEvidence";

type Json = Record<string, unknown>;

const ENTRIES = "notificationConfig-entries";

function notificationConfig(config: Json): Json {
    return config.notificationConfig as Json;
}

function entriesOf(config: Json): Json[] {
    return (notificationConfig(config).entries ?? []) as Json[];
}

async function openNotificationsConfig(page: Page): Promise<void> {
    await page.goto("ui/react?redirect=/config/notifications");
    await dismissWelcomeDialog(page);
    await expect(page.getByTestId("config-shell")).toBeVisible();
    await expect(page.getByTestId("config-notifications")).toBeVisible();
}

async function addNotification(page: Page, eventType: string): Promise<void> {
    await page.getByTestId(`config-repeat-add-${ENTRIES}`).click();
    await page
        .getByTestId(`config-repeat-add-option-${ENTRIES}-${eventType}`)
        .click();
}

async function selectAppriseType(page: Page, label: string): Promise<void> {
    await page.getByRole("combobox", {name: "Apprise type"}).click();
    await page.getByRole("option", {name: label, exact: true}).click();
}

async function saveAndExpectSuccess(page: Page): Promise<void> {
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

/**
 * The row index of the entry whose title template input holds `title`. Entry
 * order is preserved across a save, but locating the row by its own content
 * keeps the assertions honest if that ever stops being true.
 */
async function entryIndexByTitle(page: Page, title: string): Promise<number> {
    const inputs = page.locator(
        `[data-testid^="config-input-${ENTRIES}-"][data-testid$="-titleTemplate"]`,
    );
    const count = await inputs.count();
    for (let index = 0; index < count; index += 1) {
        const input = inputs.nth(index);
        if ((await input.inputValue()) === title) {
            const testId = await input.getAttribute("data-testid");
            const match = testId?.match(
                new RegExp(`^config-input-${ENTRIES}-(\\d+)-titleTemplate$`),
            );
            if (match) {
                return Number(match[1]);
            }
        }
    }
    throw new Error(`No notification entry titled "${title}" found`);
}

test.describe("Config notifications tab round trip", () => {
    test("should add an entry seeded from its event type, save, reload, and keep its templates", async ({
        page,
        hydra,
    }) => {
        const before = (await hydra.getConfig()) as Json;
        const entriesBefore = entriesOf(before);
        const title = "System test indexer disabled";
        const urls = "json://localhost:8099";

        await openNotificationsConfig(page);

        await addNotification(page, "INDEXER_DISABLED");
        const addedIndex = entriesBefore.length;
        const entry = page.getByTestId(
            `config-repeat-entry-${ENTRIES}-${addedIndex}`,
        );
        await expect(entry).toBeVisible();
        // The heading is the event's humanized name, and the templates were
        // seeded from that event rather than left blank.
        await expect(
            page.getByRole("heading", {name: "Indexer disabled"}),
        ).toBeVisible();
        const seededBody =
            "NZBHydra: Indexer $indexerName$ was disabled (state: $state$). Message:\n$message$.";
        await expect(
            entry.getByTestId(`config-input-${ENTRIES}-${addedIndex}-bodyTemplate`),
        ).toHaveValue(seededBody);
        await expect(
            entry.getByTestId(
                `config-input-${ENTRIES}-${addedIndex}-titleTemplate`,
            ),
        ).toHaveValue("Indexer disabled");

        // `NotificationConfigValidator` rejects an entry without URLs.
        await entry
            .getByTestId(`config-input-${ENTRIES}-${addedIndex}-appriseUrls`)
            .fill(urls);
        await entry
            .getByTestId(`config-input-${ENTRIES}-${addedIndex}-titleTemplate`)
            .fill(title);

        await saveAndExpectSuccess(page);

        // A full document load proves the entry was persisted rather than only
        // held in the form.
        await page.reload();
        await dismissWelcomeDialog(page);
        await expect(page.getByTestId("config-notifications")).toBeVisible();

        const savedIndex = await entryIndexByTitle(page, title);
        const savedEntry = page.getByTestId(
            `config-repeat-entry-${ENTRIES}-${savedIndex}`,
        );
        await expect(
            savedEntry.getByTestId(
                `config-input-${ENTRIES}-${savedIndex}-appriseUrls`,
            ),
        ).toHaveValue(urls);
        await expect(
            savedEntry.getByTestId(
                `config-input-${ENTRIES}-${savedIndex}-bodyTemplate`,
            ),
        ).toHaveValue(seededBody);
        // The select's own value display, not its row: the row's text also
        // carries the visible label.
        await expect(
            savedEntry.getByRole("combobox", {name: "Message type"}),
        ).toHaveText("Warning");
        await expect(
            page.getByRole("heading", {name: "Indexer disabled"}),
        ).toBeVisible();

        const after = (await hydra.getConfig()) as Json;
        const entriesAfter = entriesOf(after);
        expect(entriesAfter).toHaveLength(entriesBefore.length + 1);
        expect(
            entriesAfter.find((candidate) => candidate.titleTemplate === title),
        ).toEqual({
            eventType: "INDEXER_DISABLED",
            appriseUrls: urls,
            titleTemplate: title,
            bodyTemplate: seededBody,
            messageType: "WARNING",
        });
        for (const original of entriesBefore) {
            expect(entriesAfter).toContainEqual(original);
        }
    });

    test("should remove an entry and persist the removal", async ({
        page,
        hydra,
    }) => {
        const before = (await hydra.getConfig()) as Json;
        const entriesBefore = entriesOf(before);

        await openNotificationsConfig(page);
        await addNotification(page, "UPDATE_INSTALLED");
        const addedIndex = entriesBefore.length;
        await page
            .getByTestId(`config-input-${ENTRIES}-${addedIndex}-appriseUrls`)
            .fill("json://localhost:8099");
        await saveAndExpectSuccess(page);

        await page
            .getByTestId(`config-repeat-remove-${ENTRIES}-${addedIndex}`)
            .click();
        await expect(
            page.getByTestId(`config-repeat-entry-${ENTRIES}-${addedIndex}`),
        ).toBeHidden();
        await saveAndExpectSuccess(page);

        const after = (await hydra.getConfig()) as Json;
        expect(entriesOf(after)).toHaveLength(entriesBefore.length);
    });
});

test.describe("Config notifications tab visual evidence", () => {
    for (const viewport of ["desktop", "mobile"] as const) {
        test(`should capture the Notifications tab states at ${viewport}`, async ({
            page,
            hydra,
        }) => {
            await hydra.getConfig();

            await prepareVisualEvidence(page, viewport, async () => {
                await openNotificationsConfig(page);
            });
            // Apprise off: neither transport field is shown.
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-NOTIFICATIONS",
                    `notifications-apprise-off-${viewport}`,
                ),
                fullPage: true,
            });

            await selectAppriseType(page, "API");
            await expect(
                page.getByTestId(
                    "config-setting-notificationConfig-appriseApiUrl",
                ),
            ).toBeVisible();
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-NOTIFICATIONS",
                    `notifications-apprise-api-${viewport}`,
                ),
                fullPage: true,
            });

            await addNotification(page, "RESULT_DOWNLOAD");
            await addNotification(page, "AUTH_FAILURE");
            await expect(
                page.getByRole("heading", {name: "NZB download"}),
            ).toBeVisible();
            await expect(
                page.getByRole("heading", {name: "Auth failure"}),
            ).toBeVisible();
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-NOTIFICATIONS",
                    `notifications-two-entries-${viewport}`,
                ),
                fullPage: true,
            });
        });
    }
});
