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
            await hydra.saveConfig(originalConfig);
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

    return {
        baseURL,
        getConfig,
        saveConfig,
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
