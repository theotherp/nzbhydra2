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

type HydraApi = {
    baseURL: string;
    getConfig(): Promise<HydraConfig>;
    saveConfig(config: HydraConfig): Promise<HydraConfig>;
    applyBaseline(): Promise<void>;
    configureMockIndexers(apiKeys?: string[]): Promise<void>;
    assertUniqueIndexerCredentials(): Promise<void>;
    rotateLogs(): Promise<void>;
    configureSabnzbdMock(): Promise<void>;
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
        }));

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
     * Overrides only the fields whose wrong value the suite has actually been
     * caught inheriting, on top of the config as it stands:
     *
     * - `indexers`: three mocks on one host with distinct API keys. Not empty
     *   and not indistinguishable: `BaseConfigValidator` warns "No indexers
     *   configured" for the first and "same host and API key" for the second,
     *   and either warning replaces the "Configuration saved." toast the
     *   `config-*` specs wait for. Written only when the list is not *already*
     *   such a set (`mockApiKeysOf`), because a `PUT /internalapi/config` that
     *   changes the indexer list costs about four seconds per changed indexer
     *   -- measured against this instance: 8.04s to go from two mocks to
     *   three, 4.03s back to two, 0.01s for a PUT that changes no indexer.
     *   Rewriting the list unconditionally therefore fought
     *   `configureMockIndexers` in every spec that wants a different number of
     *   them, and cost `results.spec.ts` alone 7.3 minutes against 1.2 before
     *   this fixture existed. A list a spec left as `Mock<key>` mocks on the
     *   mockserver host is already what this asserts about it, so it is left
     *   alone and its keys are what `assertUniqueIndexerCredentials` then
     *   checks.
     * - `main.showNews`: on, per `baseConfig.yml`'s default.
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
     * Deliberately narrow: every field here is one the suite has been
     * *observed* to inherit wrongly, with the failure it caused named above. A
     * spec that needs something else says so in its own `beforeEach`, which
     * runs after this -- `config-categories.spec.ts` establishes that its own
     * categories do not exist yet that way, rather than the baseline carrying
     * a copy of the default category list.
     */
    const applyBaseline = async (): Promise<void> => {
        const config = await getConfig();
        const inheritedMockKeys = mockApiKeysOf(config.indexers);
        const apiKeys = inheritedMockKeys ?? ["1", "2", "3"];
        if (inheritedMockKeys === undefined) {
            config.indexers = mockIndexers(apiKeys);
        }
        config.main = {
            ...(config.main as HydraConfig),
            showNews: true,
            indexerSelectionAsCheckboxes: false,
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
        await saveConfig(config);
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

        async configureSabnzbdMock(): Promise<void> {
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
 * entry a `Mock<key>` on the mockserver host, with distinct names and at least
 * one of them. `configureMockIndexers` and `applyBaseline` are the only writers
 * of such a list and both derive the name from the key, so the keys are
 * recoverable from the names -- `GET /internalapi/config` redacts the keys
 * themselves.
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
            keys.includes(key)
        ) {
            return undefined;
        }
        keys.push(key);
    }
    return keys;
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
