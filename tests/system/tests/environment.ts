export class TestEnvironment {
    readonly playwrightBaseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:5076";
    readonly hydraInternalApiKey = process.env.HYDRA_INTERNAL_API_KEY || "internalApiKey";
    readonly hydraExternalUrl = process.env.HYDRA_EXTERNAL_URL || "http://host.docker.internal:5076";
    readonly mockserverExternalUrl = process.env.MOCKSERVER_EXTERNAL_URL || "http://127.0.0.1:5080";
    readonly mockserverInternalUrl = process.env.MOCKSERVER_INTERNAL_URL || "http://mockserver:5080";
    readonly radarrInternalUrl = process.env.RADARR_INTERNAL_URL || "http://127.0.0.1:7878";
    readonly radarrApiKey = process.env.RADARR_API_KEY || "system-test-api-key-12345";
    readonly sonarrPresetUrl = process.env.SONARR_PRESET_URL || "http://localhost:8989";
    readonly sonarrApiKey = process.env.SONARR_API_KEY || "system-test-api-key-12345";
    readonly sabnzbdMockApiKey = process.env.SABNZBD_MOCK_API_KEY || "deterministic-sabnzbd-key";
}

export const testEnvironment = new TestEnvironment();
