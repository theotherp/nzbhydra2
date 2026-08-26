import {ThemeProvider} from "@mui/material";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {cleanup, render, screen} from "@testing-library/react";
import type {ReactNode} from "react";
import {FormProvider, useForm} from "react-hook-form";
import {afterEach, describe, expect, it, vi} from "vitest";

import type {ConfigValues} from "../../../api/config/schema";
import {ApiTransport} from "../../../api/transport";
import {createHydraTheme} from "../../../app/theme";
import {DialogProvider} from "../../../components/dialogs/DialogProvider";
import {ToastProvider} from "../../../components/toasts/ToastProvider";
import {ShowAdvancedContext} from "../advancedFields";
import {AuthConfigTab} from "../auth/AuthConfigTab";
import {CategoriesConfigTab} from "../categories/CategoriesConfigTab";
import {DownloadingConfigTab} from "../downloading/DownloadingConfigTab";
import {ExternalToolsConfigTab} from "../external-tools/ExternalToolsConfigTab";
import {IndexersConfigTab} from "../indexers/IndexersConfigTab";
import {MainConfigTab} from "../main/MainConfigTab";
import {NotificationsConfigTab} from "../notifications/NotificationsConfigTab";
import {SearchingConfigTab} from "../searching/SearchingConfigTab";
import {settingsIndexForTab, type SettingsIndexEntry} from "./settingsIndex";

/**
 * The drift test that keeps `C-CONFIG-SETTINGS-INDEX` honest.
 *
 * The index is hand-maintained over ~140 settings, so the only thing standing
 * between it and silent rot is this file. It renders every tab and compares
 * both directions:
 *
 *   (a) every non-conditional index entry is actually on screen — an entry for
 *       a setting that was renamed or removed fails here;
 *   (b) every setting row on screen is in the index — a task that adds a
 *       setting and forgets to index it fails here, by name.
 *
 * Direction (b) is the one that matters most and the one that is easiest to
 * make vacuous, so it also asserts that it is looking at a non-trivial number
 * of rows and that its one exclusion (below) cannot swallow a real one.
 */

/**
 * The trap direction (b) has to avoid. A list section renders its *entries*
 * through the same `C-CONFIG-FIELDS` controls as a tab does, so
 * `categoriesConfig.categories.0.name` produces a perfectly ordinary
 * `config-setting-*` test id. Those are per-entry fields, explicitly out of the
 * index's vocabulary (a list section contributes one entry, not one per field
 * per row), so they are excluded — but *narrowly*: only a path with a numeric
 * segment, which is the array index and nothing else. A blunter rule (skipping
 * anything under a list's path prefix) would also hide a genuinely unindexed
 * top-level row and make this direction pass vacuously.
 */
const ENTRY_FIELD_INDEX = /(?:^|-)\d+(?:-|$)/;

function isListEntryField(testId: string): boolean {
    return ENTRY_FIELD_INDEX.test(testId.replace("config-setting-", ""));
}

function renderedSettingTestIds(): string[] {
    return screen
        .queryAllByTestId(/^config-setting-/)
        .map((element) => element.getAttribute("data-testid") ?? "");
}

type TabCase = {
    /** Extra fixtures rendered for direction (b) only, to reach gated rows. */
    alternativeFixtures?: readonly {label: string; values: ConfigValues}[];
    body: (transport: ApiTransport) => ReactNode;
    label: string;
    tab: string;
    /** Chosen so that every non-conditional row of the tab renders. */
    values: ConfigValues;
};

const MAIN_VALUES: ConfigValues = {
    main: {
        apiKey: "abc123",
        backupFolder: "backup",
        host: "0.0.0.0",
        keepHistory: true,
        logging: {
            consolelevel: "DEBUG",
            historyUserInfoType: "NONE",
            logIpAddresses: true,
            logfilelevel: "INFO",
            markersToLog: [],
        },
        port: 5076,
        proxyIgnoreDomains: [],
        proxyType: "SOCKS",
        sniDisabledFor: [],
        ssl: true,
        theme: "grey",
        urlBase: "/",
        verifySslDisabledFor: [],
    },
};

const AUTH_VALUES: ConfigValues = {
    auth: {
        authHeader: "X-Forwarded-User",
        authHeaderIpRanges: [],
        authType: "FORM",
        oidcScopes: [],
        users: [{username: "admin", maySeeAdmin: true}],
    },
};

const AUTH_OIDC_VALUES: ConfigValues = {
    auth: {
        authType: "OIDC",
        // Empty on purpose: the explicit endpoint fields hide once discovery
        // has an issuer URI, so only an empty one renders all of them.
        oidcIssuerUri: "",
        oidcScopes: [],
        users: [],
    },
};

const SEARCHING_VALUES: ConfigValues = {
    searching: {
        applyRestrictions: "ALL",
        customMappings: [],
        customQuickFilterButtons: [],
        forbiddenGroups: [],
        forbiddenPosters: [],
        forbiddenWords: [],
        language: "en",
        languagesToKeep: [],
        preselectQuickFilterButtons: [],
        removeTrailing: [],
        requiredWords: [],
        showQuickFilterButtons: true,
        userAgents: [],
    },
};

const CATEGORIES_VALUES: ConfigValues = {
    categoriesConfig: {
        categories: [
            {
                name: "Movies",
                forbiddenWords: [],
                newznabCategories: [],
                requiredWords: [],
            },
        ],
        defaultCategory: "All",
    },
};

const DOWNLOADING_VALUES: ConfigValues = {
    downloading: {
        downloaders: [{name: "nzbget", downloaderType: "NZBGET"}],
        nzbAccessType: "PROXY",
        showDownloaderStatus: true,
    },
};

const EXTERNAL_TOOLS_VALUES: ConfigValues = {
    externalTools: {externalTools: [], syncOnConfigChange: false},
};

const INDEXERS_VALUES: ConfigValues = {
    categoriesConfig: {categories: [{name: "All"}]},
    indexers: [{name: "Mock", state: "ENABLED", score: 0}],
};

const NOTIFICATIONS_VALUES: ConfigValues = {
    notificationConfig: {
        appriseType: "API",
        displayNotifications: true,
        entries: [
            {
                eventType: "RESULT_DOWNLOAD",
                appriseUrls: [],
                messageType: "INFO",
            },
        ],
        filterOuts: [],
    },
};

const TAB_CASES: readonly TabCase[] = [
    {
        body: (transport) => <MainConfigTab transport={transport} />,
        label: "Main",
        tab: "main",
        values: MAIN_VALUES,
    },
    {
        alternativeFixtures: [{label: "OIDC", values: AUTH_OIDC_VALUES}],
        body: () => <AuthConfigTab />,
        label: "Authorization",
        tab: "auth",
        values: AUTH_VALUES,
    },
    {
        body: (transport) => <SearchingConfigTab transport={transport} />,
        label: "Searching",
        tab: "searching",
        values: SEARCHING_VALUES,
    },
    {
        body: () => <CategoriesConfigTab />,
        label: "Categories",
        tab: "categories",
        values: CATEGORIES_VALUES,
    },
    {
        body: (transport) => <DownloadingConfigTab transport={transport} />,
        label: "Downloading",
        tab: "downloading",
        values: DOWNLOADING_VALUES,
    },
    {
        body: (transport) => <ExternalToolsConfigTab transport={transport} />,
        label: "External Tools",
        tab: "externalTools",
        values: EXTERNAL_TOOLS_VALUES,
    },
    {
        body: (transport) => <IndexersConfigTab transport={transport} />,
        label: "Indexers",
        tab: "indexers",
        values: INDEXERS_VALUES,
    },
    {
        alternativeFixtures: [
            {
                label: "Apprise CLI",
                values: {
                    notificationConfig: {
                        ...NOTIFICATIONS_VALUES.notificationConfig,
                        appriseType: "CLI",
                    },
                },
            },
        ],
        body: (transport) => <NotificationsConfigTab transport={transport} />,
        label: "Notifications",
        tab: "notifications",
        values: NOTIFICATIONS_VALUES,
    },
];

function renderTab(
    tabCase: TabCase,
    values: ConfigValues,
    showAdvanced = true,
): void {
    const transport = new ApiTransport(
        "/",
        vi.fn<typeof fetch>(() => {
            throw new Error("no request expected");
        }),
    );
    const queryClient = new QueryClient({
        defaultOptions: {queries: {retry: false}},
    });
    function Host() {
        const form = useForm<ConfigValues>({
            defaultValues: structuredClone(values),
            shouldUnregister: false,
        });
        return (
            <ThemeProvider theme={createHydraTheme("dark")}>
                <QueryClientProvider client={queryClient}>
                    <DialogProvider>
                        <ToastProvider>
                            <FormProvider {...form}>
                                {/*
                                 * Advanced shown, so no row is missing merely
                                 * because a disclosure is collapsed: the index
                                 * covers advanced settings too, and FM-098's
                                 * expanders are not what this test is about.
                                 */}
                                <ShowAdvancedContext.Provider
                                    value={showAdvanced}
                                >
                                    {tabCase.body(transport)}
                                </ShowAdvancedContext.Provider>
                            </FormProvider>
                        </ToastProvider>
                    </DialogProvider>
                </QueryClientProvider>
            </ThemeProvider>
        );
    }
    render(<Host />);
}

function indexRows(tab: string): SettingsIndexEntry[] {
    return settingsIndexForTab(tab).filter((entry) => entry.kind === "row");
}

afterEach(cleanup);

describe("C-CONFIG-SETTINGS-INDEX drift", () => {
    for (const tabCase of TAB_CASES) {
        it(`should render every indexed setting of the ${tabCase.label} tab`, () => {
            renderTab(tabCase, tabCase.values);

            const rendered = new Set(renderedSettingTestIds());
            const missing = indexRows(tabCase.tab)
                .filter((entry) => !entry.conditional)
                .filter((entry) => !rendered.has(entry.anchorTestId))
                .map((entry) => entry.path);

            expect(
                missing,
                `indexed but not rendered on the ${tabCase.label} tab — the index names settings this tab does not render`,
            ).toEqual([]);
        });

        const fixtures = [
            {label: "default", values: tabCase.values},
            ...(tabCase.alternativeFixtures ?? []),
        ];
        for (const fixture of fixtures) {
            it(`should index every setting the ${tabCase.label} tab renders (${fixture.label} fixture)`, () => {
                renderTab(tabCase, fixture.values);

                const indexed = new Set(
                    indexRows(tabCase.tab).map((entry) => entry.anchorTestId),
                );
                const rendered = renderedSettingTestIds();
                const unindexed = rendered
                    .filter((testId) => !isListEntryField(testId))
                    .filter((testId) => !indexed.has(testId));

                expect(
                    unindexed,
                    `rendered on the ${tabCase.label} tab but missing from settingsIndex.ts — add a record for each of these, or settings search cannot find them`,
                ).toEqual([]);
            });
        }
    }

    for (const tabCase of TAB_CASES) {
        /**
         * The `advanced` column, checked against the thing it claims to
         * describe rather than against itself. It is what decides whether a
         * hit has to be revealed before it can be scrolled to, so a row
         * mislabelled here produces a search result that navigates to a row
         * that never appears — and no amount of path-level agreement would
         * catch it. With the global toggle off, `SettingRow` renders nothing
         * for a hidden row, so what remains on screen *is* the non-advanced
         * set.
         */
        it(`should mark exactly the advanced settings of the ${tabCase.label} tab`, () => {
            renderTab(tabCase, tabCase.values, false);

            const rendered = new Set(renderedSettingTestIds());
            const wrong = indexRows(tabCase.tab)
                .filter((entry) => !entry.conditional)
                .filter(
                    (entry) =>
                        entry.advanced === rendered.has(entry.anchorTestId),
                )
                .map(
                    (entry) =>
                        `${entry.path} is indexed as ${entry.advanced ? "advanced" : "not advanced"} but the toggle-off tab ${rendered.has(entry.anchorTestId) ? "shows" : "hides"} it`,
                );

            expect(wrong).toEqual([]);
        });

        /**
         * The `fieldset` column, likewise. Revealing a hit behind an advanced
         * gate drives FM-098's per-fieldset expander *by label*, so a row
         * attributed to the wrong fieldset would open the wrong group and
         * leave the row hidden.
         */
        it(`should place every ${tabCase.label} setting in the fieldset it actually renders in`, () => {
            renderTab(tabCase, tabCase.values);

            const wrong = indexRows(tabCase.tab)
                .map((entry) => {
                    const row = screen.queryByTestId(entry.anchorTestId);
                    if (row === null) {
                        return null;
                    }
                    const enclosing = row.closest(
                        "[data-testid^='config-fieldset-']",
                    );
                    const actual =
                        enclosing === null
                            ? null
                            : (enclosing.getAttribute("data-testid") ?? "")
                                  .replace("config-fieldset-", "")
                                  .toLowerCase();
                    const claimed = entry.fieldset?.toLowerCase() ?? null;
                    return actual === claimed
                        ? null
                        : `${entry.path} is indexed under ${String(claimed)} but renders under ${String(actual)}`;
                })
                .filter((message): message is string => message !== null);

            expect(wrong).toEqual([]);
        });
    }

    /**
     * Direction (b) is only worth anything if it is actually looking at rows.
     * An exclusion that grew too broad, a fixture that stopped rendering, or a
     * selector that stopped matching would all turn the assertions above green
     * while checking nothing, so the volume is pinned here.
     */
    it("should compare a non-trivial number of rendered rows, not zero", () => {
        let compared = 0;
        for (const tabCase of TAB_CASES) {
            renderTab(tabCase, tabCase.values);
            compared += renderedSettingTestIds().filter(
                (testId) => !isListEntryField(testId),
            ).length;
            cleanup();
        }

        expect(compared).toBeGreaterThan(100);
    });

    /**
     * The narrowness of the one exclusion direction (b) makes. If the rule
     * ever matched a path the index actually holds, that setting could be
     * dropped from the index without any test noticing.
     */
    it("should exclude only list-entry fields, never an indexed setting", () => {
        const wronglyExcluded = TAB_CASES.flatMap((tabCase) =>
            indexRows(tabCase.tab)
                .filter((entry) => isListEntryField(entry.anchorTestId))
                .map((entry) => entry.path),
        );

        expect(wronglyExcluded).toEqual([]);
    });

    it("should actually exercise the exclusion on the list sections", () => {
        const excluded: string[] = [];
        for (const tabCase of TAB_CASES) {
            renderTab(tabCase, tabCase.values);
            excluded.push(...renderedSettingTestIds().filter(isListEntryField));
            cleanup();
        }

        // Categories, Auth users, and the notification entries each render a
        // seeded entry in the fixtures above; if none of them did, the
        // exclusion would be untested and could quietly widen.
        expect(excluded.length).toBeGreaterThan(0);
    });
});
