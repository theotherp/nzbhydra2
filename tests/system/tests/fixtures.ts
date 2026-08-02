import {APIRequestContext, APIResponse, expect, Page, Response, test as base} from "@playwright/test";

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
    configureMockIndexers(): Promise<void>;
    configureSabnzbdMock(): Promise<void>;
    resetSabnzbdRecording(): Promise<void>;
    getSabnzbdRecording(): Promise<Record<string, unknown>>;
    mockNzbUrl(nzbId: string): string;
};

type HydraFixtures = {
    hydra: HydraApi;
    diagnostics: void;
};

const internalApiKey = process.env.HYDRA_INTERNAL_API_KEY || "internalApiKey";
const mockserverExternalUrl = process.env.MOCKSERVER_EXTERNAL_URL || "http://127.0.0.1:5080";
const mockserverInternalUrl = process.env.MOCKSERVER_INTERNAL_URL || "http://mockserver:5080";

export const test = base.extend<HydraFixtures>({
    page: async ({page}, use) => {
        await page.addInitScript(() => window.localStorage.clear());
        await use(page);
    },

    hydra: async ({request, baseURL}, use) => {
        const resolvedBaseURL = baseURL || "http://127.0.0.1:5076";
        await waitForHydra(request, resolvedBaseURL);

        const hydra = createHydraApi(request, resolvedBaseURL);
        const originalConfig = await hydra.getConfig();
        await use(hydra);
        try {
            await hydra.saveConfig(originalConfig);
        } catch (error) {
            throw new Error(`Failed to restore Hydra configuration after the test: ${formatError(error)}`);
        }
    },

    diagnostics: [async ({page}, use, testInfo) => {
        const diagnostics: string[] = [];
        page.on("pageerror", error => diagnostics.push(`Page exception: ${error.stack || error.message}`));
        page.on("response", response => recordInternalApiFailure(response, diagnostics));

        await use();

        if (diagnostics.length === 0) {
            return;
        }

        const details = diagnostics.join("\n\n");
        await testInfo.attach("browser-diagnostics", {
            body: Buffer.from(details),
            contentType: "text/plain",
        });
        throw new Error(`Browser diagnostics detected unexpected failures:\n${details}`);
    }, {auto: true}],
});

export {expect};

export async function dismissWelcomeDialog(page: Page): Promise<void> {
    const welcomeDialog = page.getByRole("dialog").filter({hasText: "Welcome to NZBHydra 2"});
    if (await welcomeDialog.isVisible()) {
        await welcomeDialog.getByRole("button", {name: "Close", exact: true}).click();
        await expect(welcomeDialog).toBeHidden();
    }
}

async function waitForHydra(request: APIRequestContext, baseURL: string): Promise<void> {
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
        await new Promise(resolve => setTimeout(resolve, 1_000));
    }

    throw new Error(`Hydra did not become healthy at ${healthUrl} after ${attempts} attempts; last result: ${lastStatus}`);
}

function createHydraApi(request: APIRequestContext, baseURL: string): HydraApi {
    const internalRequest = (data?: HydraConfig) => ({params: {internalApiKey}, data});

    const getConfig = async (): Promise<HydraConfig> => {
        const response = await request.get("/internalapi/config", internalRequest());
        await expectSuccessfulResponse(response, "GET /internalapi/config");
        return await response.json() as HydraConfig;
    };

    const saveConfig = async (config: HydraConfig): Promise<HydraConfig> => {
        const response = await request.put("/internalapi/config", internalRequest(config));
        await expectSuccessfulResponse(response, "PUT /internalapi/config");
        const result = await response.json() as ConfigValidationResult;
        expect(result.ok, `Configuration validation errors: ${(result.errorMessages || []).join(", ")}`).toBe(true);
        expect(result.errorMessages || [], "Configuration save returned errors").toEqual([]);
        expect(result.newConfig, "Configuration save did not return the saved configuration").toBeTruthy();
        return result.newConfig as HydraConfig;
    };

    return {
        baseURL,
        getConfig,
        saveConfig,
        async configureMockIndexers(): Promise<void> {
            const config = await getConfig();
            config.indexers = ["1", "2", "3"].map(apiKey => ({
                name: `UI Test Mock ${apiKey}`,
                host: mockserverInternalUrl,
                apiPath: "/api",
                apiKey,
                backend: "NEWZNAB",
                allCapsChecked: true,
                supportedSearchTypes: ["SEARCH", "TVSEARCH", "MOVIE", "BOOK"],
                supportedSearchIds: ["IMDB", "TVMAZE", "TMDB"],
            }));
            await saveConfig(config);
        },
        async configureSabnzbdMock(): Promise<void> {
            const config = await getConfig();
            const downloading = config.downloading as HydraConfig;
            downloading.nzbAccessType = "PROXY";
            downloading.downloaders = [{
                name: "Deterministic SABnzbd",
                apiKey: "deterministic-sabnzbd-key",
                url: `${mockserverInternalUrl}/sabnzbd`,
                downloaderType: "SABNZBD",
                downloadType: "NZB",
                nzbAddingType: "UPLOAD",
                addPaused: true,
                enabled: true,
            }];
            await saveConfig(config);
        },
        async resetSabnzbdRecording(): Promise<void> {
            const response = await request.post(`${mockserverExternalUrl}/sabnzbd/recording/reset`);
            await expectSuccessfulResponse(response, "POST /sabnzbd/recording/reset");
        },
        async getSabnzbdRecording(): Promise<Record<string, unknown>> {
            const response = await request.get(`${mockserverExternalUrl}/sabnzbd/recording`);
            await expectSuccessfulResponse(response, "GET /sabnzbd/recording");
            return await response.json() as Record<string, unknown>;
        },
        mockNzbUrl(nzbId: string): string {
            return `${mockserverExternalUrl}/nzb/${encodeURIComponent(nzbId)}`;
        },
    };
}

async function expectSuccessfulResponse(response: APIResponse, operation: string): Promise<void> {
    expect(response.status(), `${operation} returned: ${await response.text()}`).toBe(200);
}

function recordInternalApiFailure(response: Response, diagnostics: string[]): void {
    if (response.status() < 500 || !new URL(response.url()).pathname.startsWith("/internalapi/")) {
        return;
    }
    diagnostics.push(`Unexpected ${response.status()} response from ${response.url()}`);
}

function formatError(error: unknown): string {
    return error instanceof Error ? error.stack || error.message : String(error);
}
