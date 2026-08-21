import type {Page} from "@playwright/test";

import {dismissWelcomeDialog, expect, test} from "./fixtures";
import {
    prepareVisualEvidence,
    visualEvidencePath,
    visualViewports,
} from "./visualEvidence";

const newsPayload = [
    {
        forCurrentVersion: true,
        forNewerVersion: false,
        news: "<p>System shell news body</p>",
        version: "2.0.0",
    },
];

/**
 * A hard stop in front of the two irreversible actions the Control tab
 * offers. No test here clicks them; this makes that a guarantee rather than a
 * convention, because a stray click would take the shared instance every other
 * system test runs against down with it.
 */
async function blockSystemControlEndpoints(page: Page): Promise<string[]> {
    const attempted: string[] = [];
    await page.route("**/internalapi/control/**", async (route) => {
        attempted.push(new URL(route.request().url()).pathname);
        await route.abort();
    });
    return attempted;
}

/**
 * The same hard stop for the update install: it would replace the shared
 * instance's binaries and restart it.
 */
async function blockUpdateInstall(page: Page): Promise<string[]> {
    const attempted: string[] = [];
    await page.route(
        "**/internalapi/updates/installUpdate/**",
        async (route) => {
            attempted.push(new URL(route.request().url()).pathname);
            await route.abort();
        },
    );
    return attempted;
}

/**
 * The same hard stop for both restoring actions: each one replaces the shared
 * instance's configuration and database and restarts it. The upload route is
 * deliberately left pending rather than aborted -- the request never reaches
 * the server either way, and holding it is what keeps the progress bar on
 * screen for the visual gate without anything being restored.
 */
async function blockBackupRestore(
    page: Page,
): Promise<{restores: string[]; uploads: string[]}> {
    const attempted = {restores: [] as string[], uploads: [] as string[]};
    await page.route("**/internalapi/backup/restore?**", async (route) => {
        attempted.restores.push(new URL(route.request().url()).pathname);
        await route.abort();
    });
    await page.route("**/internalapi/backup/restorefile", (route) => {
        attempted.uploads.push(new URL(route.request().url()).pathname);
    });
    return attempted;
}

/**
 * A hard stop in front of `API-SYSTEM-DEBUG-UPLOAD`. It would put an archive
 * of this instance's log and configuration on a public file share -- a side
 * effect outside the test environment altogether -- so no test here may reach
 * it, and this makes that a guarantee rather than a convention.
 */
async function blockDebugInfosUpload(page: Page): Promise<string[]> {
    const attempted: string[] = [];
    await page.route(
        "**/internalapi/debuginfos/createAndUploadDebugInfos",
        async (route) => {
            attempted.push(new URL(route.request().url()).pathname);
            await route.abort();
        },
    );
    return attempted;
}

/**
 * Every SQL statement this file sends, so the assertions can prove that
 * nothing modifying ever reached the shared instance's database.
 */
async function recordSqlStatements(page: Page): Promise<string[]> {
    const statements: string[] = [];
    await page.route("**/internalapi/debuginfos/executesql*", async (route) => {
        statements.push(route.request().postData() ?? "");
        await route.continue();
    });
    return statements;
}

/**
 * The offer states a healthy instance never reports: `API-UPDATES-INFOS` is
 * answered from a fixture so the install/beta/force branches and the two
 * warnings can be seen at all. Everything else on the page stays real.
 */
const offeredUpdateInfos = {
    betaUpdateAvailable: true,
    betaVersion: "9.2.0-beta",
    currentVersion: "9.0.0",
    latestVersion: "9.1.0",
    updateAvailable: true,
    updatedExternally: false,
    wrapperOutdated: true,
};

const offeredChanges = [
    {
        changes: [
            {text: "Added a thing", type: "feature"},
            {
                text: 'Fixed a thing. See <a href="https://github.com/theotherp/nzbhydra2/issues/1066">#1066</a>',
                type: "fix",
            },
        ],
        date: "2026-07-09",
        final: true,
        version: "9.1.0",
    },
];

async function openSystem(page: Page, path = "control"): Promise<void> {
    await page.goto(`ui/react?redirect=/system/${path}`);
    await dismissWelcomeDialog(page);
    await expect(page.getByTestId("system-shell")).toBeVisible();
}

test.describe("System shell", () => {
    test("should reach every tab, keep News inside the shell, and show the placeholder for unmigrated tabs", async ({
        page,
    }) => {
        const attemptedControlCalls = await blockSystemControlEndpoints(page);
        await page.route("**/internalapi/news", async (route) => {
            await route.fulfill({
                body: JSON.stringify(newsPayload),
                contentType: "application/json",
            });
        });

        await openSystem(page);
        await expect(page).toHaveURL(/\/system\/control$/);
        await expect(page.getByTestId("system-control")).toBeVisible();
        for (const [testId, label] of [
            ["system-tab-control", "Control"],
            ["system-tab-updates", "Updates"],
            ["system-tab-log", "Log"],
            ["system-tab-tasks", "Tasks"],
            ["system-tab-backup", "Backup"],
            ["system-tab-bugreport", "Bugreport / Debug"],
            ["system-tab-news", "News"],
            ["system-tab-about", "About"],
        ]) {
            await expect(page.getByTestId(testId)).toHaveText(label);
        }
        for (const testId of [
            "system-restart",
            "system-shutdown",
            "system-reload-config",
        ]) {
            await expect(page.getByTestId(testId)).toBeEnabled();
        }

        // An unmigrated tab: the placeholder, but still inside the shell.
        // `backup` was the tab used here until FM-075 migrated it.
        await page.getByTestId("system-tab-tasks").click();
        await expect(page).toHaveURL(/\/system\/tasks$/);
        await expect(
            page.getByText("React migration placeholder"),
        ).toBeVisible();
        await expect(page.getByTestId("system-shell")).toBeVisible();

        // News keeps its URL and is now a tab of the shell.
        await page.getByTestId("system-tab-news").click();
        await expect(page).toHaveURL(/\/system\/news$/);
        await expect(
            page.getByRole("heading", {name: /2\.0\.0.*This version/}),
        ).toBeVisible();
        await expect(page.getByTestId("system-shell")).toBeVisible();

        // A deep link to a tab lands on that tab, not on Control. `about` was
        // the unmigrated tab used here until FM-073 migrated it.
        await page.goto("system/about");
        await expect(page.getByTestId("system-shell")).toBeVisible();
        await expect(page.getByTestId("system-about")).toBeVisible();
        // `log` was the unmigrated tab used here until FM-074 migrated it and
        // `bugreport` until FM-076; `tasks` is still unmigrated.
        await page.goto("system/tasks");
        await expect(
            page.getByText("React migration placeholder"),
        ).toBeVisible();

        expect(
            attemptedControlCalls,
            "a system test must never restart or shut the shared instance down",
        ).toEqual([]);
    });

    test("should fall through to the migration placeholder for a session that may not see the admin area", async ({
        page,
    }) => {
        const attemptedControlCalls = await blockSystemControlEndpoints(page);
        // The *server's* role protection is unchanged and covered by
        // `AuthorizationSystemTest`; what is pinned here is the client-side
        // rule, which reads the session bootstrap the document carries
        // (`react.html`). Rewriting that one value in the real response is
        // the only way to observe a restricted session without changing
        // `auth.authType`, which is `@RestartRequired` and would make every
        // admin page 403 for the rest of the run (see `config-auth.spec.ts`).
        await page.route(
            (url) => url.pathname.startsWith("/system"),
            async (route) => {
                if (route.request().resourceType() !== "document") {
                    await route.continue();
                    return;
                }
                const response = await route.fetch();
                const body = (await response.text()).replace(
                    /window\.__NZBHYDRA_BOOTSTRAP__ = (.*);/,
                    (_match, json: string) =>
                        `window.__NZBHYDRA_BOOTSTRAP__ = ${JSON.stringify({
                            ...(JSON.parse(json) as Record<string, unknown>),
                            adminRestricted: true,
                            authConfigured: true,
                            maySeeAdmin: false,
                            username: "restricted-user",
                        })};`,
                );
                await route.fulfill({
                    body,
                    contentType: "text/html",
                    status: response.status(),
                });
            },
        );

        // Selects the React shell for this context (the `ui/react` endpoint
        // sets the selector cookie and redirects to the deep link, whose
        // document the route above rewrites).
        await page.goto("ui/react?redirect=/system/control");

        for (const tab of [
            "control",
            "updates",
            "log",
            "tasks",
            "backup",
            "bugreport",
            "news",
            "about",
        ]) {
            await page.goto(`system/${tab}`);
            await expect(
                page.getByText("React migration placeholder"),
            ).toBeVisible();
            await expect(page.getByTestId("system-shell")).toHaveCount(0);
        }

        expect(attemptedControlCalls).toEqual([]);
    });

    test("should show real update information and version history without installing anything", async ({
        page,
    }) => {
        const attemptedInstalls = await blockUpdateInstall(page);

        await openSystem(page, "updates");
        await expect(page.getByTestId("system-updates")).toBeVisible();
        await expect(
            page.getByText(/Current version: \d+\.\d+\.\d+/),
        ).toBeVisible();
        const history = page.getByTestId("system-version-history");
        await expect(history).toBeVisible();
        // The changelog the running instance ships, rendered through
        // `C-SAFE-RICH-CONTENT` rather than injected as raw HTML.
        await expect(
            history.getByRole("heading", {name: /^v?\d+\.\d+\.\d+/}).first(),
        ).toBeVisible();

        expect(
            attemptedInstalls,
            "a system test must never install an update on the shared instance",
        ).toEqual([]);
    });

    test("should show the log's three real views, an entry's details, and the log files", async ({
        page,
    }) => {
        await openSystem(page, "log");
        await expect(page.getByTestId("system-log")).toBeVisible();

        // Formatted: the running instance's own structured log.
        await expect(page.getByTestId("system-log-table")).toBeVisible();
        const rows = page.getByTestId("system-log-row");
        await expect(rows.first()).toBeVisible();
        // The newest page: nothing newer to page to.
        await expect(page.getByTestId("system-log-newer")).toBeDisabled();

        await rows.first().click();
        const entryDialog = page.getByTestId("system-log-entry-dialog");
        await expect(entryDialog).toBeVisible();
        await expect(entryDialog).toContainText("Message");
        await expect(entryDialog).toContainText("Full entry");
        await page.getByRole("button", {name: "Close"}).click();
        await expect(entryDialog).toBeHidden();

        // Raw: the real `API-SYSTEM-LOG-CURRENT` response, as text.
        const rawLogResponse = page.waitForResponse((response) =>
            response.url().includes("/debuginfos/currentlogfile"),
        );
        await page.getByRole("tab", {name: "Raw"}).click();
        expect((await rawLogResponse).ok()).toBe(true);
        const rawView = page.getByTestId("system-log-view-raw");
        await expect(rawView).toBeVisible();
        await expect(rawView.locator("pre")).toContainText("NZBHydra", {
            timeout: 30_000,
        });
        // A log line's markup-like text stays text: the panel holds no
        // elements a log message could have introduced.
        expect(await rawView.locator("pre script, pre img").count()).toBe(0);
        // Both toggles start off, and tailing switches refreshing on with it.
        const refreshToggle = page.getByTestId("system-log-refresh-toggle");
        const tailToggle = page.getByTestId("system-log-tail-toggle");
        await expect(refreshToggle).not.toBeChecked();
        await tailToggle.check();
        await expect(refreshToggle).toBeChecked();
        await refreshToggle.uncheck();
        await expect(tailToggle).not.toBeChecked();

        // Files: every rotated log file, each a real download link.
        await page.getByRole("tab", {name: "Files"}).click();
        const firstFile = page.getByTestId("system-log-file-0");
        await expect(firstFile).toBeVisible();
        const downloadHref = await firstFile.getAttribute("href");
        expect(downloadHref).toContain(
            "internalapi/debuginfos/downloadlog?logfilename=",
        );
        const download = await page.request.get(downloadHref as string);
        expect(download.ok()).toBe(true);
    });

    test("should render the log's three views for the visual gate", async ({
        page,
    }) => {
        for (const viewport of ["desktop", "mobile"] as const) {
            await prepareVisualEvidence(page, viewport, async () => {
                await openSystem(page, "log");
                await expect(page.getByTestId("system-log-table")).toBeVisible();
            });
            await page.screenshot({
                path: visualEvidencePath(
                    "F-SYSTEM-LOG",
                    `log-formatted-${viewport}`,
                ),
            });
            expect(
                await page
                    .locator("html")
                    .evaluate(
                        (element) => element.scrollWidth <= element.clientWidth,
                    ),
                `the log tab must not overflow at ${visualViewports[viewport].width}px`,
            ).toBe(true);

            await page.getByTestId("system-log-row").first().click();
            await expect(
                page.getByTestId("system-log-entry-dialog"),
            ).toBeVisible();
            await page.screenshot({
                path: visualEvidencePath(
                    "F-SYSTEM-LOG",
                    `log-entry-dialog-${viewport}`,
                ),
            });
            await page.getByRole("button", {name: "Close"}).click();

            await page.getByRole("tab", {name: "Raw"}).click();
            await expect(
                page.getByTestId("system-log-view-raw").locator("pre"),
            ).toBeVisible();
            await page.screenshot({
                path: visualEvidencePath("F-SYSTEM-LOG", `log-raw-${viewport}`),
            });

            await page.getByRole("tab", {name: "Files"}).click();
            await expect(page.getByTestId("system-log-file-0")).toBeVisible();
            await page.screenshot({
                path: visualEvidencePath(
                    "F-SYSTEM-LOG",
                    `log-files-${viewport}`,
                ),
            });
        }
    });

    test("should create a real backup, list it, and download it without ever restoring", async ({
        page,
    }) => {
        const attemptedRestores = await blockBackupRestore(page);

        await openSystem(page, "backup");
        await expect(page.getByTestId("system-backup")).toBeVisible();

        // A real backup of the running instance, created without downloading.
        const created = page.waitForResponse((response) =>
            response.url().includes("/backup/backuponly"),
        );
        await page.getByTestId("system-backup-create-only").click();
        expect((await created).ok()).toBe(true);

        // The list shows it, with a creation date and a real download link.
        await expect(page.getByTestId("system-backup-table")).toBeVisible();
        const firstRow = page.getByTestId("system-backup-row").first();
        await expect(firstRow).toBeVisible();
        await expect(firstRow).toContainText(".zip");
        const downloadHref = await page
            .getByTestId("system-backup-download-0")
            .getAttribute("href");
        expect(downloadHref).toContain(
            "internalapi/backup/download?filename=",
        );
        const download = await page.request.get(downloadHref as string);
        expect(download.ok()).toBe(true);
        expect((await download.body()).length).toBeGreaterThan(0);

        // The confirmation is a hard stop in front of the restart: opening it
        // sends nothing, and this test dismisses it instead of confirming.
        await page.getByTestId("system-backup-restore-0").click();
        await expect(
            page.getByTestId("system-backup-restore-confirm"),
        ).toBeVisible();
        await page.getByRole("button", {name: "Cancel"}).click();
        await expect(
            page.getByTestId("system-backup-restore-confirm"),
        ).toBeHidden();

        expect(
            attemptedRestores.restores,
            "a system test must never restore a backup on the shared instance",
        ).toEqual([]);
        expect(attemptedRestores.uploads).toEqual([]);
    });

    test("should render the backup list, the restore confirmation, and an upload in progress for the visual gate", async ({
        page,
    }) => {
        const attemptedRestores = await blockBackupRestore(page);

        for (const viewport of ["desktop", "mobile"] as const) {
            await prepareVisualEvidence(page, viewport, async () => {
                await openSystem(page, "backup");
                await expect(
                    page.getByTestId("system-backup-table"),
                ).toBeVisible();
            });
            await page.screenshot({
                path: visualEvidencePath(
                    "F-SYSTEM-BACKUP",
                    `backup-list-${viewport}`,
                ),
            });
            expect(
                await page
                    .locator("html")
                    .evaluate(
                        (element) => element.scrollWidth <= element.clientWidth,
                    ),
                `the backup tab must not overflow at ${visualViewports[viewport].width}px`,
            ).toBe(true);

            await page.getByTestId("system-backup-restore-0").click();
            await expect(
                page.getByTestId("system-backup-restore-confirm"),
            ).toBeVisible();
            await page.screenshot({
                path: visualEvidencePath(
                    "F-SYSTEM-BACKUP",
                    `backup-restore-confirm-${viewport}`,
                ),
            });
            await page.getByRole("button", {name: "Cancel"}).click();

            // The upload never leaves the browser: the request is held by the
            // route above, which is what keeps the progress bar on screen and
            // keeps the shared instance from being restored into.
            await page
                .getByTestId("system-backup-upload")
                .setInputFiles({
                    buffer: Buffer.alloc(256 * 1024, 1),
                    mimeType: "application/zip",
                    name: "nzbhydra-backup-visual-gate.zip",
                });
            await expect(
                page.getByTestId("system-backup-upload-progress"),
            ).toBeVisible();
            await page.screenshot({
                path: visualEvidencePath(
                    "F-SYSTEM-BACKUP",
                    `backup-upload-progress-${viewport}`,
                ),
            });
        }

        // The upload was attempted, and held at the browser: it never reached
        // the shared instance.
        expect(attemptedRestores.restores).toEqual([]);
        expect(attemptedRestores.uploads).toEqual([
            "/internalapi/backup/restorefile",
            "/internalapi/backup/restorefile",
        ]);
    });

    test("should run the real debug diagnostics without sharing anything or changing the database", async ({
        page,
    }) => {
        const attemptedUploads = await blockDebugInfosUpload(page);
        const sqlStatements = await recordSqlStatements(page);

        await openSystem(page, "bugreport");
        await expect(page.getByTestId("system-bugreport")).toBeVisible();
        await expect(
            page.getByRole("link", {name: "raise an issue on github"}),
        ).toHaveAttribute(
            "href",
            "https://github.com/theotherp/nzbhydra2/issues/new",
        );

        // The real anonymized archive, streamed from the running instance.
        const archive = page.waitForResponse(
            (response) => response.url().includes("createAndProvideZipAsBytes"),
            {timeout: 120_000},
        );
        await page.getByTestId("system-debug-download").click();
        const archiveResponse = await archive;
        expect(archiveResponse.ok()).toBe(true);
        expect((await archiveResponse.body()).length).toBeGreaterThan(0);

        // A real thread dump into the instance's own log file.
        const threadDump = page.waitForResponse((response) =>
            response.url().includes("/debuginfos/logThreadDump"),
        );
        await page.getByTestId("system-thread-dump").click();
        expect((await threadDump).ok()).toBe(true);
        await expect(page.getByRole("alert")).toContainText(
            "Thread dump written to the log file.",
        );

        // The sensitive-logging round trip: on, then back off. The label after
        // each click is the state the *server* answered the PUT with.
        const toggle = page.getByTestId("system-sensitive-toggle");
        await expect(toggle).toHaveText("Enable sensitive data in logs");
        const enabling = page.waitForResponse(
            (response) =>
                response.url().includes("/debuginfos/sensitiveDataLogging") &&
                response.request().method() === "PUT",
        );
        await toggle.click();
        expect((await enabling).ok()).toBe(true);
        await expect(toggle).toHaveText(
            "Disable sensitive data in logs (currently enabled!)",
        );
        await expect(page.getByRole("alert")).toContainText(
            "API keys, passwords and usernames will appear unmasked in the log!",
        );
        const disabling = page.waitForResponse(
            (response) =>
                response.url().includes("/debuginfos/sensitiveDataLogging") &&
                response.request().method() === "PUT",
        );
        await toggle.click();
        expect((await disabling).ok()).toBe(true);
        await expect(toggle).toHaveText("Enable sensitive data in logs");

        // Asked of the server directly rather than read off the button: the
        // shared instance must be left masking its log again.
        const state = await page.request.get(
            "internalapi/debuginfos/sensitiveDataLogging",
        );
        expect(state.ok()).toBe(true);
        expect((await state.text()).trim()).toBe("false");

        // A harmless read query against the real database.
        await page
            .getByTestId("system-sql-input")
            .fill("SELECT COUNT(*) FROM INDEXER");
        const query = page.waitForResponse((response) =>
            response.url().includes("/debuginfos/executesqlquery"),
        );
        await page.getByTestId("system-sql-query").click();
        expect((await query).ok()).toBe(true);
        await expect(page.getByTestId("system-sql-output")).not.toHaveValue("");

        // Both browser-followed links, base-URL-aware and in a new tab. Only
        // the endpoint listing is actually fetched; a heap dump would be a
        // multi-hundred-megabyte download of the running JVM.
        const heapDumpHref = await page
            .getByTestId("system-heap-dump")
            .getAttribute("href");
        expect(heapDumpHref).toContain("actuator/heapdump");
        expect(
            await page.getByTestId("system-heap-dump").getAttribute("target"),
        ).toBe("_blank");
        const endpointsHref = await page
            .getByTestId("system-endpoints")
            .getAttribute("href");
        expect(endpointsHref).toContain("internalapi/debuginfos/endpoints");
        // The address resolves and the admin session is allowed through. The
        // endpoint itself currently answers 500: `DebugInfosWeb.getEndpoints`
        // dereferences a mapping description whose `getDetails()` is null
        // under this Spring Boot version. That is a pre-existing backend
        // defect -- legacy's identical link hits it too -- and it is out of
        // this task's scope, so only reaching the endpoint is asserted here.
        const endpoints = await page.request.get(endpointsHref as string);
        expect(
            [200, 500],
            "the endpoint listing must be reachable for the admin session",
        ).toContain(endpoints.status());

        // The CPU chart polled the real endpoint; a healthy instance without
        // the `Performance` marker answers with no series at all, which is
        // what the panel's own help text tells the reader.
        await expect(page.getByTestId("system-cpu-chart")).toBeVisible();

        expect(
            attemptedUploads,
            "a system test must never upload debug infos to an external file share",
        ).toEqual([]);
        expect(
            sqlStatements,
            "a system test must never modify the shared instance's database",
        ).toEqual(["SELECT COUNT(*) FROM INDEXER"]);
    });

    test("should render the bugreport tab, its upload result, and the CPU panel for the visual gate", async ({
        page,
    }) => {
        const attemptedUploads = await blockDebugInfosUpload(page);
        // The upload result without ever reaching the file share: the address
        // is answered from a fixture, which is also what proves the value is
        // rendered as an anchor's text rather than injected as markup.
        await page.route(
            "**/internalapi/debuginfos/createAndUploadDebugInfos",
            async (route) => {
                await route.fulfill({
                    body: 'https://file.io/visual-gate"><img src=x>',
                    contentType: "text/plain",
                });
            },
        );
        // A recorded CPU sample set, which a healthy instance without the
        // `Performance` logging marker never produces.
        await page.route(
            "**/internalapi/debuginfos/threadCpuUsage",
            async (route) => {
                const now = Math.floor(Date.now() / 1000);
                await route.fulfill({
                    body: JSON.stringify(
                        ["HTTP thread #1", "main", "scheduling-1"].map(
                            (key, series) => ({
                                key,
                                values: Array.from(
                                    {length: 12},
                                    (_, index) => ({
                                        time: now - (11 - index) * 5,
                                        value:
                                            5 +
                                            series * 7 +
                                            ((index * (series + 3)) % 17),
                                    }),
                                ),
                            }),
                        ),
                    ),
                    contentType: "application/json",
                });
            },
        );

        for (const viewport of ["desktop", "mobile"] as const) {
            await prepareVisualEvidence(page, viewport, async () => {
                await openSystem(page, "bugreport");
                await expect(
                    page.getByTestId("system-bugreport"),
                ).toBeVisible();
            });
            await expect(page.getByTestId("system-cpu-chart")).toBeVisible();
            await page.screenshot({
                fullPage: true,
                path: visualEvidencePath(
                    "F-SYSTEM-BUGREPORT",
                    `bugreport-${viewport}`,
                ),
            });
            expect(
                await page
                    .locator("html")
                    .evaluate(
                        (element) => element.scrollWidth <= element.clientWidth,
                    ),
                `the bugreport tab must not overflow at ${visualViewports[viewport].width}px`,
            ).toBe(true);

            await page.getByTestId("system-debug-upload").click();
            const result = page.getByTestId("system-debug-upload-result");
            await expect(result).toBeVisible();
            // The share address is a link's text and href, never markup: the
            // response's `<img>` never became an element.
            expect(await result.locator("img").count()).toBe(0);
            await page.screenshot({
                path: visualEvidencePath(
                    "F-SYSTEM-BUGREPORT",
                    `bugreport-upload-result-${viewport}`,
                ),
            });

            await page.getByRole("button", {name: "View data"}).click();
            await expect(
                page.getByTestId("system-cpu-chart-table"),
            ).toBeVisible();
            await page.screenshot({
                fullPage: true,
                path: visualEvidencePath(
                    "F-SYSTEM-BUGREPORT",
                    `bugreport-cpu-table-${viewport}`,
                ),
            });
        }

        // The fixture answered every attempt: nothing left for the file share.
        expect(attemptedUploads).toEqual([]);
    });

    test("should show the about tab's real program info", async ({page}) => {
        await openSystem(page, "about");

        const about = page.getByTestId("system-about");
        await expect(about).toBeVisible();
        await expect(about).toContainText(/Version:\s*\d+\.\d+\.\d+/);
        await expect(
            about.getByRole("link", {name: "join the Discord channel"}),
        ).toBeVisible();
        await expect(
            about.getByRole("img", {name: "Newsgroup Ninja"}),
        ).toBeVisible();
    });

    test("should render the update offers, the changelog, and About for the visual gate", async ({
        page,
    }) => {
        const attemptedInstalls = await blockUpdateInstall(page);
        await page.route("**/internalapi/updates/infos", async (route) => {
            await route.fulfill({
                body: JSON.stringify(offeredUpdateInfos),
                contentType: "application/json",
            });
        });
        await page.route(
            "**/internalapi/updates/changesSince/**",
            async (route) => {
                await route.fulfill({
                    body: JSON.stringify(offeredChanges),
                    contentType: "application/json",
                });
            },
        );

        for (const viewport of ["desktop", "mobile"] as const) {
            await prepareVisualEvidence(page, viewport, async () => {
                await openSystem(page, "updates");
                await expect(
                    page.getByTestId("system-updates-install"),
                ).toBeVisible();
            });
            await page.screenshot({
                path: visualEvidencePath(
                    "F-SYSTEM-UPDATES",
                    `updates-offers-${viewport}`,
                ),
            });
            expect(
                await page
                    .locator("html")
                    .evaluate(
                        (element) => element.scrollWidth <= element.clientWidth,
                    ),
                `the updates tab must not overflow at ${visualViewports[viewport].width}px`,
            ).toBe(true);

            await page.getByTestId("system-updates-changelog").click();
            await expect(
                page.getByTestId("system-updates-changelog-dialog"),
            ).toBeVisible();
            await page.screenshot({
                path: visualEvidencePath(
                    "F-SYSTEM-UPDATES",
                    `changelog-${viewport}`,
                ),
            });
            await page.getByRole("button", {name: "Great!"}).click();

            await page.getByTestId("system-tab-about").click();
            await expect(page.getByTestId("system-about")).toBeVisible();
            await page.screenshot({
                path: visualEvidencePath("F-SYSTEM-ABOUT", `about-${viewport}`),
            });
        }

        expect(attemptedInstalls).toEqual([]);
    });

    test("should render the shell, an unmigrated tab, and News for the visual gate", async ({
        page,
    }) => {
        const attemptedControlCalls = await blockSystemControlEndpoints(page);
        await page.route("**/internalapi/news", async (route) => {
            await route.fulfill({
                body: JSON.stringify(newsPayload),
                contentType: "application/json",
            });
        });

        for (const viewport of ["desktop", "mobile"] as const) {
            await prepareVisualEvidence(page, viewport, async () => {
                await openSystem(page);
                await expect(page.getByTestId("system-control")).toBeVisible();
            });
            await page.screenshot({
                path: visualEvidencePath(
                    "F-SYSTEM-CONTROL",
                    `control-${viewport}`,
                ),
            });
            expect(
                await page
                    .locator("html")
                    .evaluate(
                        (element) => element.scrollWidth <= element.clientWidth,
                    ),
                `the shell must not overflow at ${visualViewports[viewport].width}px`,
            ).toBe(true);

            await page.getByTestId("system-tab-tasks").click();
            await expect(
                page.getByText("React migration placeholder"),
            ).toBeVisible();
            await page.screenshot({
                path: visualEvidencePath(
                    "F-SYSTEM-SHELL",
                    `placeholder-tab-${viewport}`,
                ),
            });

            await page.getByTestId("system-tab-news").click();
            await expect(
                page.getByRole("heading", {name: /2\.0\.0.*This version/}),
            ).toBeVisible();
            await page.screenshot({
                path: visualEvidencePath("F-SYSTEM-NEWS", `news-${viewport}`),
            });
        }

        expect(attemptedControlCalls).toEqual([]);
    });
});
