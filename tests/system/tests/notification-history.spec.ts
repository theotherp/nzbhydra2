import type {APIRequestContext} from "@playwright/test";

import {dismissWelcomeDialog, expect, test, testEnvironment} from "./fixtures";
import {prepareVisualEvidence, visualEvidencePath} from "./visualEvidence";

/**
 * FM-023: `/stats/notifications` as a consumer of `C-HISTORY-REFINE-BAR` and
 * `C-HISTORY-REQUEST`.
 *
 * Notification rows are produced deterministically rather than waited for: a
 * notification is only persisted when a configured `NotificationConfigEntry`
 * matches the event (`NotificationHandler#handleNotification`), and its title
 * and body are that entry's filled templates. Configuring the templates here is
 * what makes the markup/URL safety assertions below real -- the strings the
 * browser renders are the strings this test wrote into the database.
 */

const DOWNLOAD_TITLE = "System test NZB download";
const DOWNLOAD_BODY =
    'Grabbed from https://example.com/details\nSecond line javascript:alert(1) <b>markup</b> <img src=x onerror="alert(1)">';
const DISABLED_TITLE = "System test indexer disabled";
const DISABLED_BODY = "Indexer $indexerName$ went down";

test.describe("Notification history", () => {
    test.beforeEach(async ({hydra, request}) => {
        const config = await hydra.getConfig();
        config.notificationConfig = {
            ...(config.notificationConfig as Record<string, unknown>),
            appriseType: "NONE",
            entries: [
                {
                    eventType: "RESULT_DOWNLOAD",
                    // Non-empty URLs are required by NotificationConfigValidator
                    // and are also the `urls` column this route renders.
                    appriseUrls:
                        "json://localhost,https://hooks.example/notify",
                    titleTemplate: DOWNLOAD_TITLE,
                    bodyTemplate: DOWNLOAD_BODY,
                    messageType: "INFO",
                },
                {
                    eventType: "INDEXER_DISABLED",
                    appriseUrls: "json://localhost",
                    titleTemplate: DISABLED_TITLE,
                    bodyTemplate: DISABLED_BODY,
                    messageType: "WARNING",
                },
            ],
            filterOuts: [],
        };
        await hydra.saveConfig(config);
        await sendTestNotification(request, "RESULT_DOWNLOAD");
        await sendTestNotification(request, "INDEXER_DISABLED");
    });

    test("should page, refine, and render notification history safely in React", async ({
        page,
    }) => {
        const firstResponse = waitForNotificationHistory(page);
        await page.goto("/stats/notifications");
        await dismissWelcomeDialog(page);
        expect((await firstResponse).status()).toBe(200);

        const table = page.getByTestId("notification-history-table");
        await expect(table).toBeVisible();
        const downloadRow = page
            .getByTestId("notification-history-row")
            .filter({hasText: DOWNLOAD_TITLE})
            .first();
        await expect(downloadRow).toBeVisible();
        // The humanized label is what the user sees; the enum constant is what
        // travels (asserted on the request body below).
        await expect(
            downloadRow.getByTestId("notification-history-type"),
        ).toHaveText("NZB download");
        await expect(
            page
                .getByTestId("notification-history-row")
                .filter({hasText: DISABLED_TITLE})
                .first()
                .getByTestId("notification-history-type"),
        ).toHaveText("Indexer disabled");
        await expect(
            page.getByTestId("notification-history-page-status"),
        ).toContainText("Page 1 of");

        // Body safety, in a real browser: line breaks are separate lines, the
        // markup is visible as characters, and no element was created from it.
        const body = downloadRow.getByTestId("notification-history-body");
        await expect(body).toContainText("<b>markup</b>");
        await expect(body).toContainText("javascript:alert(1)");
        expect(await body.locator("b").count()).toBe(0);
        expect(await body.locator("img").count()).toBe(0);
        expect(await body.locator("xpath=./div").count()).toBe(2);
        const bodyLinks = body.locator("a");
        await expect(bodyLinks).toHaveCount(1);
        await expect(bodyLinks).toHaveAttribute(
            "href",
            "https://example.com/details",
        );
        // No anchor anywhere on the page carries an executable scheme.
        expect(
            await page
                .locator("a[href]")
                .evaluateAll((links) =>
                    links.some((link) =>
                        /^\s*(javascript|data|vbscript):/i.test(
                            link.getAttribute("href") ?? "",
                        ),
                    ),
                ),
        ).toBe(false);
        const urls = downloadRow.getByTestId("notification-history-urls");
        await expect(urls).toContainText("json://localhost");
        await expect(urls.locator("a")).toHaveCount(1);

        // Refining goes through the shared bar, and the request body proves the
        // enum constant travelled -- a 200 alone would prove nothing.
        await expect(page.getByTestId("history-refine-bar")).toBeVisible();
        const filteredResponse = waitForNotificationHistory(page);
        await page
            .getByTestId("history-refine-event-type-option")
            .filter({hasText: "Indexer disabled"})
            .click();
        const filtered = await filteredResponse;
        expect(filtered.status()).toBe(200);
        expect(filtered.request().postDataJSON()).toMatchObject({
            page: 1,
            limit: 25,
            filterModel: {
                NOTIFICATION_EVENT_TYPE: {
                    filterType: "checkboxes",
                    filterValue: ["INDEXER_DISABLED"],
                },
            },
        });
        await expect(
            page
                .getByTestId("notification-history-row")
                .filter({hasText: DOWNLOAD_TITLE}),
        ).toHaveCount(0);
        await expect(
            page
                .getByTestId("notification-history-row")
                .filter({hasText: DISABLED_TITLE})
                .first(),
        ).toBeVisible();

        // Sorting on the enum column is a separate server round trip.
        const sortedResponse = waitForNotificationHistory(page);
        await page.getByRole("button", {name: "Type", exact: true}).click();
        const sorted = await sortedResponse;
        expect(sorted.status()).toBe(200);
        expect(sorted.request().postDataJSON()).toMatchObject({
            sortModel: {column: "NOTIFICATION_EVENT_TYPE", sortMode: 1},
        });

        // An empty selection is no filter at all (ADR-0016).
        const clearedResponse = waitForNotificationHistory(page);
        await page.getByTestId("history-refine-clear-all").click();
        const cleared = await clearedResponse;
        expect(cleared.status()).toBe(200);
        expect(cleared.request().postDataJSON().filterModel).toEqual({});
    });

    test("should show the empty state for a filter that matches nothing", async ({
        page,
    }) => {
        await page.goto("/stats/notifications");
        await dismissWelcomeDialog(page);
        await expect(page.getByTestId("history-refine-bar")).toBeVisible();

        const emptyResponse = waitForNotificationHistory(page);
        await page
            .getByTestId("history-refine-event-type-option")
            .filter({hasText: "Automatic update installed"})
            .click();
        const empty = await emptyResponse;
        expect(empty.status()).toBe(200);
        expect(empty.request().postDataJSON()).toMatchObject({
            filterModel: {
                NOTIFICATION_EVENT_TYPE: {
                    filterType: "checkboxes",
                    filterValue: ["UPDATE_INSTALLED"],
                },
            },
        });
        await expect(
            page.getByText(
                "No notification history entries match the current filters.",
            ),
        ).toBeVisible();
        await expect(
            page.getByTestId("notification-history-table"),
        ).toHaveCount(0);
        await expect(
            page.getByTestId("notification-history-page-status"),
        ).toContainText("0 notifications");
    });

    // FM-094: the legacy "should show the same notifications in the legacy
    // route" test is gone with the legacy shell. It existed to show that the
    // two shells rendered the same notifications with the same humanized
    // labels, which stops being a question once only one shell remains, and
    // every claim it made -- the download entry's row, its "NZB download"
    // label, and the disabled-indexer entry's "Indexer disabled" label -- is
    // asserted against React by "should page, refine, and render notification
    // history safely in React" above, on `notification-history-type`.

    /**
     * FM-126 (ADR-0038): the table scrolls inside its own container at 390px
     * and marks the edge it is clipping, so nothing continues off-canvas
     * silently. The affordance's full semantics are pinned on
     * `search-history.spec.ts`; this is the same shared component on this
     * route's own table, at its own measured width floor.
     */
    test("should scroll the table inside its container with a scroll-edge affordance at 390px", async ({
        page,
    }) => {
        await prepareVisualEvidence(page, "mobile", async () => {
            await page.goto("/stats/notifications");
            await dismissWelcomeDialog(page);
            await expect(
                page.getByTestId("notification-history-table"),
            ).toBeVisible();
        });

        expect(
            await page
                .locator("html")
                .evaluate(
                    (element) => element.scrollWidth <= element.clientWidth,
                ),
        ).toBe(true);

        const scroller = page.getByTestId("notification-history-scroller");
        const geometry = await scroller.evaluate((element) => ({
            client: element.clientWidth,
            scrollable: element.scrollWidth,
            table: (element.firstElementChild as HTMLElement).clientWidth,
        }));
        expect(geometry.table).toBeGreaterThanOrEqual(800);
        expect(geometry.scrollable).toBeGreaterThan(geometry.client);

        await expect(
            page.getByTestId("table-scroll-affordance-end"),
        ).toBeVisible();
        await expect(
            page.getByTestId("table-scroll-affordance-start"),
        ).toHaveCount(0);
        // The table sits below the refine bar, so bring it into the
        // frame: a strip of the page header is not evidence of a table.
        await page
            .getByTestId("notification-history-table")
            .scrollIntoViewIfNeeded();
        await page.screenshot({
            path: visualEvidencePath(
                "F-HISTORY-NOTIFICATIONS",
                "table-scroll-affordance-mobile",
            ),
        });

        // ADR-0038's other half: at this width no cell may have to break a
        // word. Measured rather than eyeballed -- the longest word each
        // event-type cell holds must fit the width its column was given.
        expect(
            await page
                .getByTestId("notification-history-table")
                .evaluate((element) => {
                    const broken: string[] = [];
                    const cells = element.querySelectorAll<HTMLElement>(
                        '[data-testid="notification-history-type"]',
                    );
                    for (const cell of cells) {
                        for (const word of (cell.textContent ?? "")
                            .trim()
                            .split(/\s+/)) {
                            const probe = document.createElement("span");
                            probe.style.cssText =
                                "position:absolute;visibility:hidden;white-space:pre";
                            probe.textContent = word;
                            cell.append(probe);
                            const needed = probe.getBoundingClientRect().width;
                            probe.remove();
                            if (needed > cell.clientWidth + 0.5) {
                                broken.push(word);
                            }
                        }
                    }
                    return broken;
                }),
        ).toEqual([]);

        await scroller.evaluate((element) => {
            element.scrollLeft = element.scrollWidth;
        });
        await expect(
            page.getByTestId("table-scroll-affordance-end"),
        ).toHaveCount(0);
        await expect(
            page.getByTestId("table-scroll-affordance-start"),
        ).toBeVisible();
        // The table sits below the refine bar, so bring it into the
        // frame: a strip of the page header is not evidence of a table.
        await page
            .getByTestId("notification-history-table")
            .scrollIntoViewIfNeeded();
        await page.screenshot({
            path: visualEvidencePath(
                "F-HISTORY-NOTIFICATIONS",
                "table-scroll-affordance-scrolled-mobile",
            ),
        });

        await prepareVisualEvidence(page, "desktop", async () => {
            await page.goto("/stats/notifications");
            await expect(
                page.getByTestId("notification-history-table"),
            ).toBeVisible();
        });
        await expect(
            page.getByTestId("table-scroll-affordance-end"),
        ).toHaveCount(0);
        // The table sits below the refine bar, so bring it into the
        // frame: a strip of the page header is not evidence of a table.
        await page
            .getByTestId("notification-history-table")
            .scrollIntoViewIfNeeded();
        await page.screenshot({
            path: visualEvidencePath(
                "F-HISTORY-NOTIFICATIONS",
                "table-scroll-affordance-desktop",
            ),
        });
    });

    test("should capture the notification history visual evidence", async ({
        page,
    }) => {
        for (const viewport of ["desktop", "mobile"] as const) {
            await prepareVisualEvidence(page, viewport, async () => {
                await page.goto("/stats/notifications");
                await dismissWelcomeDialog(page);
                await expect(
                    page.getByTestId("notification-history-table"),
                ).toBeVisible();
            });
            await page.screenshot({
                path: visualEvidencePath(
                    "F-HISTORY-NOTIFICATIONS",
                    `populated-${viewport}`,
                ),
            });

            await page
                .getByTestId("history-refine-event-type-option")
                .filter({hasText: "Indexer disabled"})
                .click();
            await expect(
                page.getByTestId("history-refine-toggle"),
            ).toContainText("1 active filter");
            await expect(
                page
                    .getByTestId("notification-history-row")
                    .filter({hasText: DOWNLOAD_TITLE}),
            ).toHaveCount(0);
            await page.screenshot({
                path: visualEvidencePath(
                    "F-HISTORY-NOTIFICATIONS",
                    `filtered-${viewport}`,
                ),
            });

            await page
                .getByTestId("history-refine-event-type-option")
                .filter({hasText: "Indexer disabled"})
                .click();
            await page
                .getByTestId("history-refine-event-type-option")
                .filter({hasText: "Automatic update installed"})
                .click();
            await expect(
                page.getByText(
                    "No notification history entries match the current filters.",
                ),
            ).toBeVisible();
            await page.screenshot({
                path: visualEvidencePath(
                    "F-HISTORY-NOTIFICATIONS",
                    `empty-${viewport}`,
                ),
            });

            expect(
                await page
                    .locator("html")
                    .evaluate(
                        (element) => element.scrollWidth <= element.clientWidth,
                    ),
            ).toBe(true);
        }
    });
});

async function sendTestNotification(
    request: APIRequestContext,
    eventType: string,
): Promise<void> {
    const response = await request.get(
        `/internalapi/notifications/test/${eventType}`,
        {params: {internalApiKey: testEnvironment.hydraInternalApiKey}},
    );
    expect(
        response.ok(),
        `Unable to create a ${eventType} notification: HTTP ${response.status()}`,
    ).toBe(true);
}

function waitForNotificationHistory(page: import("@playwright/test").Page) {
    return page.waitForResponse(
        (response) =>
            response.request().method() === "POST" &&
            new URL(response.url()).pathname ===
                "/internalapi/history/notifications",
    );
}
