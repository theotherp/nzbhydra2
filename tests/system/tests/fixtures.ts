import {
    APIRequestContext,
    APIResponse,
    expect,
    Page,
    Response,
    test as base,
} from "@playwright/test";
import {testEnvironment} from "./environment";

type HydraConfig = Record<string, unknown>;

type ConfigValidationResult = {
    errorMessages?: string[];
    newConfig?: HydraConfig;
    ok?: boolean;
};

/** FM-139's reset (`SystemTestStateResetWeb.RESET_ENDPOINT`, ADR-0048). */
const RESET_ENDPOINT = "/internalapi/systemtest/reset";

/**
 * The per-indexer fields the baseline pins on a mock indexer, and the value it
 * pins each one to.
 *
 * These are exactly the fields the specs listed on `mockApiKeysOf` write on an
 * *existing* mock entry rather than by replacing the list -- a state, a score,
 * a colour, a group, a limit -- plus the two neighbouring switches that decide
 * whether an indexer is searched at all. Each value is that field's
 * `IndexerConfig` default, so `mockIndexers` writes what `mockApiKeysOf`
 * checks for and neither can drift from the other.
 *
 * `state` is the one with teeth. `config-indexers.spec.ts:272-284` puts `Mock1`
 * into `DISABLED_USER` through the config UI and only removes that entry a few
 * lines later, so a death or a timeout in between leaves it disabled -- and a
 * disabled indexer is silently not searched. Measured on a live instance: with
 * `Mock1` disabled and `Mock2` enabled, `GET /api?t=search&q=uitest` returns
 * `indexer2-result1` and `indexer2-result2` where an enabled pair returns those
 * plus `indexer1-result1..3`. The next spec that searches without configuring
 * its own indexers therefore gets a short result set and an assertion failure
 * that reads as its own bug.
 */
const BASELINE_INDEXER_FIELDS: HydraConfig = {
    color: null,
    downloadLimit: null,
    enabledCategories: [],
    enabledForSearchSource: "BOTH",
    groupNames: [],
    hitLimit: null,
    preselect: true,
    score: 0,
    showOnSearch: true,
    state: "ENABLED",
};

/**
 * The external API key the baseline establishes.
 *
 * A value rather than "whatever the instance generated at first start", and it
 * has to be established rather than left alone, because the reset does not
 * leave one: `baseConfig.yml` has `apiKey: null`, and the key a fresh instance
 * has comes from `MainConfigValidator.initializeNewConfig`, which a reset never
 * runs. The React config form marks the field `required`
 * (`MainConfigTab.tsx:194-201`), so an instance without one answers every save
 * made through the config UI with "Config invalid - Main > API key: This field
 * is required" and sends nothing at all; that failed the `config-main` and
 * `config` round trips outright when this fixture first called the reset.
 * Alphanumeric, per that field's own help text and `apiKeyValidator`. Written
 * literally here so the value is the same on every instance and in every run.
 */
const BASELINE_API_KEY = "SYSTEMTESTAPIKEY";

/**
 * `config/baseConfig.yml` as the running instance itself reads it, fetched
 * once per worker process and reused by every `applyBaseline()` afterwards.
 *
 * The baseline for a surface with no interesting default -- the sixteen stock
 * categories, an empty downloader list, no external tools -- cannot be written
 * out here without keeping a second copy of a checked-in file in a test
 * fixture, which is the copy that goes stale. FM-139's reset hands over the
 * real one instead: reset the instance, read the configuration back, and that
 * *is* the baseline, secrets and all resolved server-side (ADR-0048). One
 * reset per process, not per test -- see `applyBaseline`.
 */
let checkedInBaseline: Promise<HydraConfig> | undefined;

type HydraApi = {
    baseURL: string;
    getConfig(): Promise<HydraConfig>;
    saveConfig(config: HydraConfig): Promise<HydraConfig>;
    applyBaseline(): Promise<void>;
    configureMockIndexers(apiKeys?: string[]): Promise<void>;
    assertUniqueIndexerCredentials(): Promise<void>;
    rotateLogs(): Promise<void>;
    configureSabnzbdMock(options?: {withNzbGet?: boolean}): Promise<void>;
    resetSabnzbdRecording(): Promise<void>;
    getSabnzbdRecording(): Promise<Record<string, unknown>>;
    mockNzbUrl(nzbId: string): string;
};

type HydraFixtures = {
    hydra: HydraApi;
    baseline: void;
    diagnostics: void;
    sensitiveDataLogging: void;
};

export const test = base.extend<HydraFixtures>({
    page: async ({page}, use) => {
        await page.addInitScript(() => window.localStorage.clear());
        await use(page);
    },

    hydra: async ({request, baseURL}, use) => {
        const resolvedBaseURL = baseURL || testEnvironment.playwrightBaseUrl;
        await waitForHydra(request, resolvedBaseURL);

        await use(createHydraApi(request, resolvedBaseURL));
    },

    /**
     * Establishes `applyBaseline()`'s configuration before every test, which
     * is what replaced the snapshot-and-restore teardown this fixture used to
     * carry (FM-133).
     *
     * Restoring afterwards only ever put back what the *previous* test had
     * left, so a test still started from a state it had not established; and
     * it could not put back a secret the server no longer holds, so a test
     * that replaced a whole list left the next one a config the restore had
     * to patch up. Establishing the state beforehand needs neither: it is the
     * same state for every test, and it is applied whether or not the
     * previous test ended cleanly.
     *
     * `auto` rather than a `beforeEach` per spec, because the claim being
     * made is that *every* test is independent of what a predecessor left --
     * one that a spec file could silently opt out of by forgetting to call
     * it. A spec that needs something other than the baseline still overrides
     * it in its own `beforeEach`, which runs afterwards.
     */
    baseline: [
        async ({hydra}, use) => {
            await hydra.applyBaseline();
            await use();
        },
        {auto: true},
    ],

    /**
     * `sensitiveDataLogging` is a `debuginfos` endpoint that toggles a static
     * logging encoder flag, not a `BaseConfig` setting -- neither
     * `applyBaseline()`'s `GET`/`PUT /internalapi/config` round trip nor the
     * snapshot-and-restore teardown it replaced ever touched it, so this is
     * the one piece of instance state still put back rather than established:
     * there is no endpoint that sets it to a known value without first being
     * told what that value is. It restores the value captured before the test
     * -- not a hardcoded `false` -- so a test that starts with the setting
     * already enabled is not masked. Opt-in per
     * test rather than `auto: true`: only the sensitive-data-logging round
     * trip in `system.spec.ts` mutates this flag.
     */
    sensitiveDataLogging: async ({request, baseURL}, use) => {
        const resolvedBaseURL = baseURL || testEnvironment.playwrightBaseUrl;
        const endpoint = new URL(
            "/internalapi/debuginfos/sensitiveDataLogging",
            resolvedBaseURL,
        ).toString();
        const params = {internalApiKey: testEnvironment.hydraInternalApiKey};

        const original = await request.get(endpoint, {params});
        await expectSuccessfulResponse(
            original,
            "GET /internalapi/debuginfos/sensitiveDataLogging",
        );
        const originallyEnabled = (await original.text()).trim() === "true";

        await use();

        try {
            const response = await request.put(endpoint, {
                params: {...params, enabled: originallyEnabled},
            });
            await expectSuccessfulResponse(
                response,
                "PUT /internalapi/debuginfos/sensitiveDataLogging",
            );
        } catch (error) {
            throw new Error(
                `Failed to restore sensitive data logging after the test: ${formatError(error)}`,
            );
        }
    },

    diagnostics: [
        async ({page}, use, testInfo) => {
            const diagnostics: string[] = [];
            page.on("pageerror", (error) =>
                diagnostics.push(
                    `Page exception: ${error.stack || error.message}`,
                ),
            );
            page.on("response", (response) =>
                recordInternalApiFailure(response, diagnostics),
            );

            await use();

            if (diagnostics.length === 0) {
                return;
            }

            const details = diagnostics.join("\n\n");
            await testInfo.attach("browser-diagnostics", {
                body: Buffer.from(details),
                contentType: "text/plain",
            });
            throw new Error(
                `Browser diagnostics detected unexpected failures:\n${details}`,
            );
        },
        {auto: true},
    ],
});

export {expect};
export {testEnvironment};

/**
 * ADR-0050 (FM-153): a history refine `checkboxes` dimension renders as a
 * `C-REFINE-MULTISELECT` -- a caption button over a collapsible list -- and
 * starts collapsed on every mount, with no persistence of the open state. Its
 * option rows are therefore not interactable until the caption is pressed.
 * Idempotent, so a section already open is left open.
 */
export async function openRefineMultiselect(
    page: Page,
    dimensionId: string,
): Promise<void> {
    const toggle = page.getByTestId(`history-refine-${dimensionId}-toggle`);
    await expect(toggle).toBeVisible();
    if ((await toggle.getAttribute("aria-expanded")) === "false") {
        await toggle.click();
    }
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(
        page.getByTestId(`history-refine-${dimensionId}-list`),
    ).toBeVisible();
}

export async function dismissWelcomeDialog(page: Page): Promise<void> {
    const welcomeDialog = page
        .getByRole("dialog")
        .filter({hasText: "Welcome to NZBHydra 2"});
    if (await welcomeDialog.isVisible()) {
        await welcomeDialog
            .getByRole("button", {name: "Close", exact: true})
            .click();
        await expect(welcomeDialog).toBeHidden();
    }
}

export async function searchForResult(
    page: Page,
    query: string,
    resultTitle: string,
): Promise<void> {
    await page.getByTestId("search-query").fill(query);
    const searchResponse = page.waitForResponse(
        (response) =>
            response.request().method() === "POST" &&
            new URL(response.url()).pathname === "/internalapi/search",
    );
    await page.getByTestId("search-submit").click();

    expect((await searchResponse).status()).toBe(200);
    await expect(page.getByTestId("search-status-modal")).toBeHidden();
    await expect(
        page.getByTestId("search-result-title").filter({hasText: resultTitle}),
    ).toBeVisible();
}

async function waitForHydra(
    request: APIRequestContext,
    baseURL: string,
): Promise<void> {
    const healthUrl = new URL("/actuator/health/ping", baseURL).toString();
    const attempts = 30;
    let lastStatus = "no response";

    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            const response = await request.get(healthUrl, {timeout: 2_000});
            lastStatus = `HTTP ${response.status()}`;
            if (response.ok()) {
                return;
            }
        } catch (error) {
            lastStatus = formatError(error);
        }
        await new Promise((resolve) => setTimeout(resolve, 1_000));
    }

    throw new Error(
        `Hydra did not become healthy at ${healthUrl} after ${attempts} attempts; last result: ${lastStatus}`,
    );
}

function createHydraApi(request: APIRequestContext, baseURL: string): HydraApi {
    const internalRequest = (data?: HydraConfig) => ({
        params: {internalApiKey: testEnvironment.hydraInternalApiKey},
        data,
    });
    let configuredMockCredentials: string[] = [];

    const getConfig = async (): Promise<HydraConfig> => {
        const response = await request.get(
            "/internalapi/config",
            internalRequest(),
        );
        await expectSuccessfulResponse(response, "GET /internalapi/config");
        return (await response.json()) as HydraConfig;
    };

    const saveConfig = async (config: HydraConfig): Promise<HydraConfig> => {
        const response = await request.put(
            "/internalapi/config",
            internalRequest(config),
        );
        await expectSuccessfulResponse(response, "PUT /internalapi/config");
        const result = (await response.json()) as ConfigValidationResult;
        expect(
            result.ok,
            `Configuration validation errors: ${(result.errorMessages || []).join(", ")}`,
        ).toBe(true);
        expect(
            result.errorMessages || [],
            "Configuration save returned errors",
        ).toEqual([]);
        expect(
            result.newConfig,
            "Configuration save did not return the saved configuration",
        ).toBeTruthy();
        return result.newConfig as HydraConfig;
    };

    const mockIndexers = (apiKeys: string[]): HydraConfig[] =>
        apiKeys.map((apiKey) => ({
            name: `Mock${apiKey}`,
            host: testEnvironment.mockserverInternalUrl,
            apiPath: "/api",
            apiKey,
            backend: "NEWZNAB",
            allCapsChecked: true,
            supportedSearchTypes: ["SEARCH", "TVSEARCH", "MOVIE", "BOOK"],
            supportedSearchIds: ["IMDB", "TVMAZE", "TMDB"],
            ...BASELINE_INDEXER_FIELDS,
        }));

    const fetchCheckedInBaseline = async (): Promise<HydraConfig> => {
        checkedInBaseline ??= (async () => {
            const response = await request.post(
                RESET_ENDPOINT,
                internalRequest(),
            );
            expect(
                response.status(),
                `POST ${RESET_ENDPOINT} returned ${await response.text()}. The reset is mapped only while the 'systemtest' Spring profile is active (ADR-0048); start the instance through misc/run_gui_systemtest.py, which activates it.`,
            ).toBe(200);
            return getConfig();
        })();
        return checkedInBaseline;
    };

    /**
     * Puts the instance into a known configuration. Applied before every test
     * by the `baseline` fixture, so no test starts from whatever the previous
     * one left.
     *
     * The suite runs against one shared, long-lived instance. Every Playwright
     * failure in runs 33237457043 and 33240679544 was a `config-*` spec
     * asserting against inherited state: an indexer list whose API keys a
     * teardown had stripped, and a `main.showNews` the Java suite had left
     * false. Restoring state afterwards cannot fix that and is not the point;
     * establishing it beforehand is.
     *
     * Two sources, one call (FM-141). The sections whose baseline is a value
     * nobody would want transcribed into a test fixture come from
     * `checkedInBaseline` -- `config/baseConfig.yml`, read back through
     * FM-139's reset. Everything else is written out below, because its
     * baseline is a claim this file is making about the suite rather than a
     * default: `showNews` is on *because a Java test turns it off*, the mock
     * indexers exist at all only because the suite needs something to search.
     *
     * The reset is issued once per worker process, not once per test. Per test
     * it would have to re-add three indexers every time, and an indexer-list
     * write is the only `PUT` on this API ever measured to cost more than
     * 0.01s -- see the `indexers` bullet for what actually charges for it.
     *
     * Overrides only the fields whose wrong value the suite has actually been
     * caught inheriting, on top of the config as it stands:
     *
     * - `indexers`: three mocks on one host with distinct API keys. Not empty
     *   and not indistinguishable: `BaseConfigValidator` warns "No indexers
     *   configured" for the first and "same host and API key" for the second,
     *   and either warning replaces the "Configuration saved." toast the
     *   `config-*` specs wait for. Written only when the list is not *already*
     *   such a set (`mockApiKeysOf`), and `mockApiKeysOf` now also requires
     *   every `BASELINE_INDEXER_FIELDS` entry to be at its default, so a list
     *   a spec left searchable-looking but disabled is rewritten rather than
     *   accepted.
     *
     *   The skip stays because an indexer-changing `PUT` is the only call here
     *   that has ever been expensive -- but the cost is *inherited state, not a
     *   backend characteristic*, which is the opposite of what FM-133
     *   recorded. Measured on this instance (FM-141): with the two external
     *   tools `external-tools.spec.ts` leaves behind, two mocks to three costs
     *   8.07s and three back to two 4.07s -- `ConfigWeb.setConfig` hands every
     *   changed indexer to `ExternalToolsSyncService.syncTools`, which is a
     *   round trip to Radarr and to Sonarr each. With `externalTools` at its
     *   baseline the identical writes cost 0.01s, and `results.spec.ts` runs
     *   the same 1.2 minutes whether this rewrites the list every test or
     *   never. FM-133 measured 8.04s/4.03s/0.01s on an instance that had run
     *   `external-tools.spec.ts`; the numbers were right and the attribution
     *   was not. Baselining `externalTools` below is what removes it.
     *
     *   A list a spec left as `Mock<key>` mocks on the mockserver host, all
     *   fields at baseline, is already what this asserts about it, so it is
     *   left alone and its keys are what `assertUniqueIndexerCredentials`
     *   then checks.
     * - `main.apiKey`: `BASELINE_API_KEY`, which is where that constant's doc
     *   explains why the reset makes this necessary.
     * - `main.showNews`: on, per `baseConfig.yml`'s default.
     * - `main.welcomeShown`: raised. The welcome dialog is one-shot server
     *   state, so a run that consumed it and a run that has not are different
     *   instances to every test that navigates. `smoke.spec.ts` used to skip
     *   its "no startup dialog" test rather than assert on either -- and under
     *   the `systemtest` profile it never actually skipped, because
     *   `application-systemtest.properties` sets `nzbhydra.welcomeShown=true`
     *   and `WelcomeWeb` reads that as well as the field, so the skip was
     *   dead code that hid the field's real value (`false` after a full suite
     *   run, measured). Raising the field means the endpoint and the config
     *   agree, on an instance with the profile and on one without.
     * - `main.indexerSelectionAsCheckboxes`: off, also that default.
     *   `config-main.spec.ts:153` turns it on, and with it on the search
     *   form's indexer control is a checkbox group rather than the `Select`
     *   `focus-indication.spec.ts:705` waits for -- a 30 second timeout, not
     *   a wrong value.
     * - `auth`: the whole block back to `AuthConfig`'s defaults, not just
     *   `authType`. `authType` and `users` move together because either alone
     *   is refused, and the `restrict*` flags move with them because they
     *   outlive `authType`: `config-auth.spec.ts` leaves `restrictAdmin` true,
     *   and with it set the anonymous session is not an admin even under
     *   `authType: NONE`, so the React shell answers `/config` with "Page not
     *   found" and shows a Login button. That is what failed 86 of 201 tests
     *   when the restore teardown was first removed -- everything from
     *   `config-auth.spec.ts:202` to the end of the run (FM-133).
     * - `searching`, the fields below, all back to `baseConfig.yml`:
     *   - the quick-filter four. `SearchResults.tsx:204-212,567-570` seeds the
     *     refine sidebar's quick-filter selection from
     *     `preselectQuickFilterButtons` and `customQuickFilterButtons`, so a
     *     preselection left behind by `results.spec.ts:133-229` filters away
     *     every result of every later search -- "0 of 28 loaded ... 28
     *     filtered". This, not any per-user preference, is the state that
     *     broke 26 of `results.spec.ts` when a fuller baseline was first tried
     *     (`563f5b293`, whose message names the wrong carrier).
     *     `showQuickFilterButtons` off (left by `config-searching.spec.ts`)
     *     removes the sidebar's whole quick-filter section instead.
     *   - the word and regex restrictions. `config-searching.spec.ts` leaves
     *     `requiredWords: ["proper"]` and `forbiddenWords: ["cam",
     *     "screener"]`, which the *backend* applies to every later search, so
     *     `results.spec.ts`, `downloads.spec.ts` and `search.spec.ts` search
     *     the mock indexers and get nothing back at all.
     *   - `customMappings` and `savedSearches`, which are lists the specs
     *     append to (`config-searching.spec.ts:207`,
     *     `search.spec.ts:114`) and then index into positionally.
     * - `notificationConfig.entries`: emptied. `config-notifications.spec.ts`
     *   adds an entry at `entriesBefore.length` and reads it back by that
     *   index, so entries a predecessor left move the one it just added.
     *
     * And the sections taken wholesale from `checkedInBaseline`:
     *
     * - `downloading`: `downloads.spec.ts`, `results.spec.ts` and
     *   `config-downloading.spec.ts` leave a `Deterministic SABnzbd` behind,
     *   and `configureSabnzbdMock` also leaves `fallbackForFailed` at `NONE`
     *   against the baseline's `BOTH`. The downloader is the visible half:
     *   the downloader-status footer renders whenever at least one enabled
     *   downloader exists, which is the thing `smoke.spec.ts` asserts the
     *   absence of -- it cleared the list by hand until this covered it.
     * - `categoriesConfig`: `config-categories.spec.ts` adds a category named
     *   "System Test ...", and `BaseConfig`'s category map is keyed by name,
     *   so a second copy makes the save answer 500 with `IllegalStateException:
     *   Duplicate key`. That file used to strip its own leftovers in a
     *   `beforeEach`; the sixteen stock categories come back here instead,
     *   which also gives every test in it a fixed list to count against.
     * - `externalTools`: `external-tools.spec.ts`'s last test leaves an
     *   enabled Radarr *and* an enabled Sonarr with `syncOnConfigChange` on,
     *   and the indexer-writing spec files that sort after it --
     *   `focus-indication`, `notched-label-geometry`, `results`, `search`,
     *   `search-history` (others, e.g. `config*` and `downloads`, sort
     *   before it and never paid) -- so each of their `configureMockIndexers` calls
     *   paid two real HTTP round trips per changed indexer. See the `indexers`
     *   bullet: this is where the "four seconds per changed indexer" went.
     * - `genericStorage`: emptied to the baseline's `{}`, then
     *   `isGroupEpisodesHelpShown` raised. It is a `BaseConfig` field, so this
     *   `PUT` reaches it -- including the `forUser` keys, which for an
     *   anonymous session are the plain keys
     *   (`GenericStorageWeb` only suffixes a `getRemoteUser()` it has). The
     *   flag is raised rather than merely defined because *not* raised is what
     *   opens FM-091's modal help dialog on the next eligible TV search, and a
     *   modal intercepts pointer events for the rest of the page:
     *   `results.spec.ts`, `search.spec.ts` and `focus-indication.spec.ts`
     *   each raise it in their own `beforeEach` for that reason, and
     *   `results.spec.ts:3367` lowers it on purpose to exercise the dialog.
     *   A death between the lowering and the dialog left it lowered for
     *   whatever ran next; it cannot now.
     *
     * Deliberately narrow all the same: every field written out above is one
     * the suite has been *observed* to inherit wrongly, with the failure it
     * caused named. A spec that needs something else says so in its own
     * `beforeEach`, which runs after this.
     *
     * Nothing is written when nothing needs to change. The whole prepared
     * configuration is compared against the one just read and the `PUT` is
     * skipped when they match, so the common case -- a test whose predecessor
     * left the instance at baseline -- costs one `GET`.
     */
    const applyBaseline = async (): Promise<void> => {
        const baseline = await fetchCheckedInBaseline();
        const config = await getConfig();
        const inherited = JSON.stringify(config);
        const inheritedMockKeys = mockApiKeysOf(config.indexers);
        const apiKeys = inheritedMockKeys ?? ["1", "2", "3"];
        if (inheritedMockKeys === undefined) {
            config.indexers = mockIndexers(apiKeys);
        }
        config.main = {
            ...(config.main as HydraConfig),
            apiKey: BASELINE_API_KEY,
            showNews: true,
            indexerSelectionAsCheckboxes: false,
            welcomeShown: true,
        };
        config.auth = {
            ...(config.auth as HydraConfig),
            authType: "NONE",
            users: [],
            restrictAdmin: false,
            restrictDetailsDl: false,
            restrictIndexerSelection: false,
            restrictSearch: false,
            restrictStats: false,
        };
        config.searching = {
            ...(config.searching as HydraConfig),
            alwaysShowQuickFilterButtons: false,
            customMappings: [],
            customQuickFilterButtons: [],
            forbiddenGroups: [],
            forbiddenPosters: [],
            forbiddenRegex: null,
            forbiddenWords: [],
            preselectQuickFilterButtons: [],
            requiredRegex: null,
            requiredWords: [],
            savedSearches: [],
            showQuickFilterButtons: true,
        };
        config.notificationConfig = {
            ...(config.notificationConfig as HydraConfig),
            entries: [],
        };
        config.categoriesConfig = structuredClone(baseline.categoriesConfig);
        config.downloading = structuredClone(baseline.downloading);
        config.externalTools = structuredClone(baseline.externalTools);
        config.genericStorage = {
            ...(structuredClone(baseline.genericStorage) as HydraConfig),
            isGroupEpisodesHelpShown: "true",
        };
        if (JSON.stringify(config) !== inherited) {
            await saveConfig(config);
        }
        configuredMockCredentials = apiKeys.map(
            (apiKey) => `${testEnvironment.mockserverInternalUrl}/${apiKey}`,
        );
    };

    return {
        baseURL,
        getConfig,
        saveConfig,
        applyBaseline,
        async configureMockIndexers(apiKeys = ["1", "2", "3"]): Promise<void> {
            const config = await getConfig();
            config.indexers = mockIndexers(apiKeys);
            await saveConfig(config);
            configuredMockCredentials = apiKeys.map(
                (apiKey) =>
                    `${testEnvironment.mockserverInternalUrl}/${apiKey}`,
            );
        },
        async assertUniqueIndexerCredentials(): Promise<void> {
            const config = await getConfig();
            const indexers = config.indexers as HydraConfig[];
            expect(indexers.map((indexer) => indexer.name)).toEqual([
                "Mock1",
                "Mock2",
                "Mock3",
            ]);
            // Hydra deliberately redacts saved API keys in GET /internalapi/config. The values submitted
            // above are the persisted configuration; ensure the requested host/key pairs are distinct.
            expect(
                new Set(configuredMockCredentials).size,
                "Every configured indexer must have unique host/API-key credentials",
            ).toBe(configuredMockCredentials.length);
        },
        /**
         * Rolls the instance's log files over, so a test that reads the log
         * reads one that starts here.
         *
         * `RawLogView` fetches the whole current log file, so what the log
         * views cost is proportional to everything the suite logged before
         * them -- on the JaCoCo-instrumented CI job that had grown past a 30
         * second wait. This is the only precondition in the suite a test could
         * not establish for itself until `PUT /internalapi/debuginfos/rotatelog`
         * existed. Rolling over rather than clearing keeps the history: the
         * archived file stays in the logs folder and in CI's uploaded log
         * artifacts, and the Files tab still has something to list.
         */
        async rotateLogs(): Promise<void> {
            const response = await request.put(
                "/internalapi/debuginfos/rotatelog",
                {params: {internalApiKey: testEnvironment.hydraInternalApiKey}},
            );
            await expectSuccessfulResponse(
                response,
                "PUT /internalapi/debuginfos/rotatelog",
            );
        },

        /**
         * @param options.withNzbGet FM-186: additionally enables the
         *   mockserver's NZBGet (`/nzbget/jsonrpc`), so the results table
         *   renders *two* per-row send buttons -- the count the row's Actions
         *   track has to fit without the icon group wrapping. Off by default,
         *   so every existing caller keeps the single-downloader downloading
         *   configuration it was written against.
         */
        async configureSabnzbdMock(options?: {
            withNzbGet?: boolean;
        }): Promise<void> {
            const config = await getConfig();
            const downloading = config.downloading as HydraConfig;
            downloading.nzbAccessType = "PROXY";
            downloading.fallbackForFailed = "NONE";
            downloading.downloaders = [
                {
                    name: "Deterministic SABnzbd",
                    apiKey: testEnvironment.sabnzbdMockApiKey,
                    url: `${testEnvironment.mockserverInternalUrl}/sabnzbd`,
                    downloaderType: "SABNZBD",
                    downloadType: "NZB",
                    nzbAddingType: "UPLOAD",
                    addPaused: true,
                    defaultCategory: testEnvironment.sabnzbdMockCategory,
                    enabled: true,
                },
                ...(options?.withNzbGet
                    ? [
                          {
                              name: testEnvironment.nzbgetMockName,
                              url: `${testEnvironment.mockserverInternalUrl}/nzbget`,
                              downloaderType: "NZBGET",
                              downloadType: "NZB",
                              nzbAddingType: "UPLOAD",
                              addPaused: true,
                              enabled: true,
                          },
                      ]
                    : []),
            ];
            await saveConfig(config);
        },
        async resetSabnzbdRecording(): Promise<void> {
            const response = await request.post(
                `${testEnvironment.mockserverExternalUrl}/sabnzbd/recording/reset`,
            );
            await expectSuccessfulResponse(
                response,
                "POST /sabnzbd/recording/reset",
            );
        },
        async getSabnzbdRecording(): Promise<Record<string, unknown>> {
            const response = await request.get(
                `${testEnvironment.mockserverExternalUrl}/sabnzbd/recording`,
            );
            await expectSuccessfulResponse(response, "GET /sabnzbd/recording");
            return (await response.json()) as Record<string, unknown>;
        },
        mockNzbUrl(nzbId: string): string {
            return `${testEnvironment.mockserverExternalUrl}/nzb/${encodeURIComponent(nzbId)}`;
        },
    };
}

/**
 * The API keys of an indexer list that is already a usable mock set: every
 * entry a `Mock<key>` on the mockserver host, with distinct names, at least one
 * of them, and every `BASELINE_INDEXER_FIELDS` entry still at its default.
 *
 * Key recovery works because every writer of such a list derives the name from
 * the key -- `GET /internalapi/config` redacts the keys themselves. There are
 * two writers of the *list*: `configureMockIndexers` and `applyBaseline`. There
 * are five more writers of an *entry inside* it, which is why the field check
 * exists: `search.spec.ts:769-781` sets `preselect` and `groupNames`,
 * `search.spec.ts:1304-1317` sets `hitLimit` and `downloadLimit`,
 * `results.spec.ts:3459-3467` sets `color`, `config.spec.ts:492-536` sets
 * `score` through the config UI, and `config-indexers.spec.ts:272-284` sets
 * `state` to `DISABLED_USER` through it. None of them changes a name or a
 * host, so before FM-141 all five produced a list this accepted unchanged --
 * `DISABLED_USER` included, and an indexer in that state is simply not
 * searched. Nothing was red only because every search-running spec happens to
 * configure its own indexers first.
 *
 * @return those keys in list order, or `undefined` when the list is anything
 * else and the baseline has to write its own.
 */
function mockApiKeysOf(indexers: unknown): string[] | undefined {
    if (!Array.isArray(indexers) || indexers.length === 0) {
        return undefined;
    }
    const keys: string[] = [];
    for (const indexer of indexers as HydraConfig[]) {
        const key = /^Mock(\d+)$/.exec(String(indexer.name))?.[1];
        if (
            key === undefined ||
            indexer.host !== testEnvironment.mockserverInternalUrl ||
            keys.includes(key) ||
            !isAtBaseline(indexer)
        ) {
            return undefined;
        }
        keys.push(key);
    }
    return keys;
}

function isAtBaseline(indexer: HydraConfig): boolean {
    return Object.entries(BASELINE_INDEXER_FIELDS).every(
        ([field, expected]) =>
            JSON.stringify(indexer[field]) === JSON.stringify(expected),
    );
}

async function expectSuccessfulResponse(
    response: APIResponse,
    operation: string,
): Promise<void> {
    expect(
        response.status(),
        `${operation} returned: ${await response.text()}`,
    ).toBe(200);
}

function recordInternalApiFailure(
    response: Response,
    diagnostics: string[],
): void {
    if (
        response.status() < 500 ||
        !new URL(response.url()).pathname.startsWith("/internalapi/")
    ) {
        return;
    }
    diagnostics.push(
        `Unexpected ${response.status()} response from ${response.url()}`,
    );
}

function formatError(error: unknown): string {
    return error instanceof Error
        ? error.stack || error.message
        : String(error);
}
