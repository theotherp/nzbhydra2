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
    await page.goto("/config/notifications");
    await dismissWelcomeDialog(page);
    await expect(page.getByTestId("config-shell")).toBeVisible();
    await expect(page.getByTestId("config-notifications")).toBeVisible();
}

/**
 * Adds an entry from the event menu. FM-106 leaves the added entry expanded,
 * so its fields are reachable straight away -- that is asserted rather than
 * assumed by the first thing every caller does with it.
 */
async function addNotification(page: Page, eventType: string): Promise<void> {
    await page.getByTestId(`config-repeat-add-${ENTRIES}`).click();
    await page
        .getByTestId(`config-repeat-add-option-${ENTRIES}-${eventType}`)
        .click();
}

async function expandEntry(page: Page, index: number): Promise<void> {
    const summary = page.getByTestId(
        `config-repeat-toggle-${ENTRIES}-${index}`,
    );
    if ((await summary.getAttribute("aria-expanded")) !== "true") {
        await summary.click();
    }
    await expect(summary).toHaveAttribute("aria-expanded", "true");
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
    // Anchored to the most recent toast: FM-084 made toasts stack, so a second
    // save leaves two in the DOM and an unanchored locator trips strict mode.
    await expect(page.getByText("Configuration saved.").last()).toBeVisible();
}

/**
 * The row index of the entry whose title template input holds `title`. Entry
 * order is preserved across a save, but locating the row by its own content
 * keeps the assertions honest if that ever stops being true. The inputs stay in
 * the DOM while their accordion is collapsed, so this works before expanding.
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

/**
 * These specs assert against the configuration, so they establish the one they
 * assert against rather than inheriting whatever the previous test left on the
 * shared instance. See `applyBaseline` in `fixtures.ts` for what it fixes and
 * why it is deliberately narrow.
 */
test.beforeEach(async ({hydra}) => {
    await hydra.applyBaseline();
});

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
        // A newly added entry opens itself: the fields it was created for are
        // reachable without a second click.
        await expect(
            page.getByTestId(`config-repeat-toggle-${ENTRIES}-${addedIndex}`),
        ).toHaveAttribute("aria-expanded", "true");
        // The summary carries the event's humanized name and the entry's
        // message type, and the templates were seeded from that event rather
        // than left blank.
        const summary = page.getByTestId(
            `config-repeat-toggle-${ENTRIES}-${addedIndex}`,
        );
        await expect(summary).toContainText("Indexer disabled");
        await expect(summary).toContainText("Warning");
        // And it is a real heading, so the list stays navigable by heading for
        // a screen reader however many entries it holds. The heading is the
        // `<h3>` stock MUI wraps *around* the summary button, and there is
        // exactly one per entry: a second one nested *inside* the button --
        // which is what a `<Typography component="h3">` in the summary
        // produces, and which jsdom and Playwright both still report while a
        // real screen reader prunes it as a button's presentational child --
        // fails this count rather than passing silently.
        const heading = entry.getByRole("heading", {level: 3});
        await expect(heading).toHaveCount(1);
        await expect(heading).toHaveText(/^Indexer disabled/);
        await expect(heading).toBeVisible();
        const seededBody =
            "NZBHydra: Indexer $indexerName$ was disabled (state: $state$). Message:\n$message$.";
        await expect(
            entry.getByTestId(
                `config-input-${ENTRIES}-${addedIndex}-bodyTemplate`,
            ),
        ).toHaveValue(seededBody);
        await expect(
            entry.getByTestId(
                `config-input-${ENTRIES}-${addedIndex}-titleTemplate`,
            ),
        ).toHaveValue("Indexer disabled");
        // The preview renders that seeded template with the sample values the
        // backend's own `getTestInstance()` carries.
        await expect(
            entry.getByTestId(`config-notification-preview-${addedIndex}-body`),
        ).toHaveText(
            "NZBHydra: Indexer Some indexer was disabled (state: Disabled temporarily). Message:\nSome message.",
        );

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
        // Entries load collapsed; the summary alone identifies them.
        await expect(
            page.getByTestId(`config-repeat-toggle-${ENTRIES}-${savedIndex}`),
        ).toHaveAttribute("aria-expanded", "false");
        await expandEntry(page, savedIndex);
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
            page.getByTestId(`config-repeat-toggle-${ENTRIES}-${savedIndex}`),
        ).toContainText("Indexer disabled");
        // Still a heading after a reload, not only for the freshly added entry.
        await expect(
            savedEntry.getByRole("heading", {
                level: 3,
                name: /^Indexer disabled/,
            }),
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

    test("should insert a variable chip into the body template, preview it, and save it", async ({
        page,
        hydra,
    }) => {
        const before = (await hydra.getConfig()) as Json;
        const entriesBefore = entriesOf(before);
        const index = entriesBefore.length;
        const title = "System test chip insertion";

        await openNotificationsConfig(page);
        await addNotification(page, "RESULT_DOWNLOAD");
        await expandEntry(page, index);

        const entry = page.getByTestId(
            `config-repeat-entry-${ENTRIES}-${index}`,
        );
        await entry
            .getByTestId(`config-input-${ENTRIES}-${index}-appriseUrls`)
            .fill("json://localhost:8099");
        await entry
            .getByTestId(`config-input-${ENTRIES}-${index}-titleTemplate`)
            .fill(title);

        // Replace the seeded body with text that has a caret position in the
        // middle of it, then insert there -- an append-only insertion would
        // pass a weaker test but is not what an admin does.
        const body = entry.getByTestId(
            `config-input-${ENTRIES}-${index}-bodyTemplate`,
        );
        await body.fill("Grabbed  from somewhere");
        await body.click();
        await body.evaluate((element: HTMLTextAreaElement) => {
            element.setSelectionRange(8, 8);
        });
        await entry
            .getByTestId(`config-notification-variable-${index}-title`)
            .click();

        const inserted = "Grabbed $title$ from somewhere";
        await expect(body).toHaveValue(inserted);
        await expect(
            entry.getByTestId(`config-notification-preview-${index}-body`),
        ).toHaveText("Grabbed Some result from somewhere");

        await saveAndExpectSuccess(page);

        const after = (await hydra.getConfig()) as Json;
        expect(
            entriesOf(after).find(
                (candidate) => candidate.titleTemplate === title,
            ),
        ).toEqual({
            eventType: "RESULT_DOWNLOAD",
            appriseUrls: "json://localhost:8099",
            titleTemplate: title,
            bodyTemplate: inserted,
            messageType: "INFO",
        });
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
        await expandEntry(page, addedIndex);
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

            const config = (await hydra.getConfig()) as Json;
            const first = entriesOf(config).length;
            await addNotification(page, "RESULT_DOWNLOAD");
            await addNotification(page, "AUTH_FAILURE");
            await expect(
                page.getByTestId(`config-repeat-toggle-${ENTRIES}-${first}`),
            ).toContainText("NZB download");
            await expect(
                page.getByTestId(
                    `config-repeat-toggle-${ENTRIES}-${first + 1}`,
                ),
            ).toContainText("Auth failure");

            // The collapsed overview: every configured entry identifiable by
            // its summary alone.
            await page
                .getByTestId(`config-repeat-toggle-${ENTRIES}-${first}`)
                .click();
            await page
                .getByTestId(`config-repeat-toggle-${ENTRIES}-${first + 1}`)
                .click();
            await expect(
                page.getByTestId(`config-repeat-toggle-${ENTRIES}-${first}`),
            ).toHaveAttribute("aria-expanded", "false");
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-NOTIFICATIONS",
                    `notifications-two-entries-${viewport}`,
                ),
                fullPage: true,
            });

            // One entry expanded, with its chips, its preview, and an inline
            // test result. The test endpoint takes the event type from the
            // path and ignores the form, so this needs no save.
            await expandEntry(page, first);
            await page
                .getByTestId(`config-notification-test-${ENTRIES}-${first}`)
                .click();
            await expect(
                page.getByTestId(`config-notification-test-result-${first}`),
            ).toBeVisible();
            // Pinned rather than left to the eye: FM-105's ADR-0029 defect was
            // a row action that laid out off-canvas at 390px, and this entry's
            // Remove control is the one that sits *below* everything the
            // expansion added. It is asserted here at both viewports because
            // the capture below cannot be trusted to show it (see the note).
            const remove = page.getByTestId(
                `config-repeat-remove-${ENTRIES}-${first}`,
            );
            await expect(remove).toBeVisible();
            const removeBox = await remove.boundingBox();
            const viewportWidth = page.viewportSize()?.width ?? 0;
            expect(removeBox).not.toBeNull();
            expect(removeBox!.x).toBeGreaterThanOrEqual(0);
            expect(removeBox!.x + removeBox!.width).toBeLessThanOrEqual(
                viewportWidth,
            );

            // The entry itself, not `fullPage`. A `fullPage` capture of this
            // tab at 390px drops the entry's Remove button from the PNG even
            // though the browser lays it out and paints it (measured at
            // 390x844: 188x32 at x=32, `visible`) -- an artifact of capturing
            // a ~2.4k-pixel document in one shot, the same one that paints
            // the sticky save bar at its viewport position mid-document. A
            // locator capture is what makes this state's evidence something
            // the owner can actually judge.
            await page
                .getByTestId(`config-repeat-entry-${ENTRIES}-${first}`)
                .screenshot({
                    path: visualEvidencePath(
                        "F-CONFIG-NOTIFICATIONS",
                        `notifications-entry-expanded-${viewport}`,
                    ),
                });

            // The foot of the same entry as a plain viewport capture. At 390px
            // the expanded entry is taller than the viewport, so both the
            // `fullPage` and the locator capture above have to be stitched
            // across scroll positions with a sticky save bar painting into
            // each one, and both lose the Remove control at the bottom. This
            // capture is a single unstitched frame, so the actions below the
            // preview are actually in the evidence.
            await remove.scrollIntoViewIfNeeded();
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-NOTIFICATIONS",
                    `notifications-entry-actions-${viewport}`,
                ),
            });
        });
    }
});
