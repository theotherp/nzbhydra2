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
    restoreConfig(config: HydraConfig): Promise<void>;
    configureMockIndexers(apiKeys?: string[]): Promise<void>;
    assertUniqueIndexerCredentials(): Promise<void>;
    configureSabnzbdMock(): Promise<void>;
    resetSabnzbdRecording(): Promise<void>;
    getSabnzbdRecording(): Promise<Record<string, unknown>>;
    mockNzbUrl(nzbId: string): string;
};

type HydraFixtures = {
    hydra: HydraApi;
    diagnostics: void;
};

export const test = base.extend<HydraFixtures>({
    page: async ({page}, use) => {
        await page.addInitScript(() => window.localStorage.clear());
        await use(page);
    },

    hydra: async ({request, baseURL}, use) => {
        const resolvedBaseURL = baseURL || testEnvironment.playwrightBaseUrl;
        await waitForHydra(request, resolvedBaseURL);

        const hydra = createHydraApi(request, resolvedBaseURL);
        const originalConfig = await hydra.getConfig();
        await use(hydra);
        try {
            await hydra.restoreConfig(originalConfig);
        } catch (error) {
            throw new Error(
                `Failed to restore Hydra configuration after the test: ${formatError(error)}`,
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

    /** The bare save, without `saveConfig`'s assertions, for `restoreConfig`. */
    const putConfig = async (
        config: HydraConfig,
    ): Promise<ConfigValidationResult> => {
        const response = await request.put(
            "/internalapi/config",
            internalRequest(config),
        );
        await expectSuccessfulResponse(response, "PUT /internalapi/config");
        return (await response.json()) as ConfigValidationResult;
    };

    /**
     * Puts the configuration captured before the test back, for teardown only.
     *
     * The snapshot came from `GET /internalapi/config`, so every secret in it
     * is the server's `***UNCHANGED***` marker rather than a value — the
     * fixture is never given the real credentials. Since FM-068 the server
     * resolves such a marker only against the record it can still identify and
     * refuses the save otherwise (ADR-0020), so a test that replaced a whole
     * list (`configureMockIndexers`, or a spec that saves its own indexers or
     * downloaders) leaves the snapshot asking for a secret the server no
     * longer holds. That secret is genuinely unrecoverable here: before
     * FM-068 the restore only appeared to work because the positional
     * fallback happened to hand over a neighbour's credential.
     *
     * So the restore is attempted as-is first — which is the byte-for-byte
     * restore every test that did not change a list's identity still gets —
     * and only if the server refuses it purely over markers it could not
     * resolve are exactly those settings dropped from the body and the save
     * retried, with a warning naming them. The server's own error messages say
     * which settings those are, so this never has to second-guess its matching
     * rule, and a rejection for any other reason is still an error.
     */
    const restoreConfig = async (config: HydraConfig): Promise<void> => {
        const first = await putConfig(config);
        if (first.ok && (first.errorMessages ?? []).length === 0) {
            return;
        }

        const errorMessages = first.errorMessages ?? [];
        const unresolved = unresolvedMarkerSettings(errorMessages);
        if (
            unresolved.length === 0 ||
            unresolved.length !== errorMessages.length
        ) {
            throw new Error(
                `Configuration validation errors: ${errorMessages.join(", ")}`,
            );
        }

        const withoutUnresolvableSecrets = structuredClone(config);
        const dropped = unresolved.filter((setting) =>
            dropSetting(withoutUnresolvableSecrets, setting),
        );
        if (dropped.length !== unresolved.length) {
            throw new Error(
                `Configuration validation errors: ${errorMessages.join(", ")}`,
            );
        }
        console.warn(
            `Restoring the configuration without ${dropped.join(", ")}: the test replaced the records these secrets belonged to, and a masked snapshot cannot restore a credential the server no longer holds.`,
        );

        const second = await putConfig(withoutUnresolvableSecrets);
        if (!second.ok || (second.errorMessages ?? []).length > 0) {
            throw new Error(
                `Configuration validation errors: ${(second.errorMessages ?? []).join(", ")}`,
            );
        }
    };

    return {
        baseURL,
        getConfig,
        saveConfig,
        restoreConfig,
        async configureMockIndexers(apiKeys = ["1", "2", "3"]): Promise<void> {
            const config = await getConfig();
            config.indexers = apiKeys.map((apiKey) => ({
                name: `Mock${apiKey}`,
                host: testEnvironment.mockserverInternalUrl,
                apiPath: "/api",
                apiKey,
                backend: "NEWZNAB",
                allCapsChecked: true,
                supportedSearchTypes: ["SEARCH", "TVSEARCH", "MOVIE", "BOOK"],
                supportedSearchIds: ["IMDB", "TVMAZE", "TMDB"],
            }));
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

/** The marker `GET /internalapi/config` substitutes for a secret it will not disclose. */
const UNCHANGED_MARKER = "***UNCHANGED***";

/**
 * The settings named by `BaseConfigValidator`'s unresolvable-marker errors, e.g.
 * `indexers[0].apiKey`. Any message that is not one of those yields nothing, so
 * a save refused for another reason can never be mistaken for this case.
 */
function unresolvedMarkerSettings(errorMessages: string[]): string[] {
    const unresolvedMarker =
        /^The setting (\S+) was submitted as "\*\*\*UNCHANGED\*\*\*"/;
    return errorMessages.flatMap((message) => {
        const setting = unresolvedMarker.exec(message)?.[1];
        return setting === undefined ? [] : [setting];
    });
}

/**
 * Removes one `main.proxyPassword`/`indexers[0].apiKey`-style setting from a
 * config body, but only while it really holds the marker.
 *
 * @return whether the setting was found and removed
 */
function dropSetting(config: HydraConfig, setting: string): boolean {
    const steps = setting.match(/[^.[\]]+/g);
    if (steps === null || steps.length < 2) {
        return false;
    }
    let current: unknown = config;
    for (const step of steps.slice(0, -1)) {
        if (current === null || typeof current !== "object") {
            return false;
        }
        current = Array.isArray(current)
            ? current[Number(step)]
            : (current as HydraConfig)[step];
    }
    const leaf = steps[steps.length - 1];
    if (
        current === null ||
        typeof current !== "object" ||
        Array.isArray(current) ||
        (current as HydraConfig)[leaf] !== UNCHANGED_MARKER
    ) {
        return false;
    }
    delete (current as HydraConfig)[leaf];
    return true;
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
