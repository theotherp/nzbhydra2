export class TestEnvironment {
    readonly playwrightBaseUrl =
        process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:5076";
    readonly hydraInternalApiKey =
        process.env.HYDRA_INTERNAL_API_KEY || "internalApiKey";
    readonly hydraExternalUrl =
        process.env.HYDRA_EXTERNAL_URL || "http://host.docker.internal:5076";
    readonly mockserverExternalUrl =
        process.env.MOCKSERVER_EXTERNAL_URL || "http://127.0.0.1:5080";
    readonly mockserverInternalUrl =
        process.env.MOCKSERVER_INTERNAL_URL || "http://mockserver:5080";
    readonly radarrInternalUrl =
        process.env.RADARR_INTERNAL_URL || "http://127.0.0.1:7878";
    readonly radarrExternalUrl =
        process.env.RADARR_EXTERNAL_URL || "http://127.0.0.1:7878";
    readonly radarrApiKey =
        process.env.RADARR_API_KEY || "system-test-api-key-12345";
    readonly sonarrPresetUrl =
        process.env.SONARR_PRESET_URL || "http://localhost:18989";
    readonly sonarrInternalUrl =
        process.env.SONARR_INTERNAL_URL || "http://sonarr:8989";
    readonly sonarrExternalUrl =
        process.env.SONARR_EXTERNAL_URL || "http://127.0.0.1:18989";
    readonly sonarrApiKey =
        process.env.SONARR_API_KEY || "system-test-api-key-12345";
    readonly sabnzbdMockApiKey =
        process.env.SABNZBD_MOCK_API_KEY || "deterministic-sabnzbd-key";
    readonly sabnzbdMockCategory =
        process.env.SABNZBD_MOCK_CATEGORY || "Deterministic Category";
    // FM-186: the second enabled downloader the per-row send buttons are
    // asserted against (`configureSabnzbdMock({withNzbGet: true})`), served by
    // the mockserver's `/nzbget/jsonrpc`.
    readonly nzbgetMockName = "Deterministic NZBGet";
    // FM-187: the black hole folders the per-row send-to-black-hole cases use.
    // `blackholeFolderHydra` is what the *instance* is configured to write to;
    // `blackholeFolderTestAccess` is where this process reads the file back.
    // They differ only under docker, whose compose file mounts the host's
    // `/tmp/hydraBlackhole_core` at the container's `/hydraBlackhole`
    // (`docker/docker-compose-systemtest/linux/docker-compose.yaml:57`); a
    // locally started core and CI's native core share the host filesystem, so
    // both default to the host side of that mount.
    readonly blackholeFolderHydra =
        process.env.BLACKHOLE_FOLDER_HYDRA || "/tmp/hydraBlackhole_core";
    readonly blackholeFolderTestAccess =
        process.env.BLACKHOLE_FOLDER_TESTACCESS || "/tmp/hydraBlackhole_core";
    // FM-187: the mockserver's deterministic torrent fixture
    // (`MockNewznab.java:44-49`), reachable only through a torznab indexer --
    // the baseline's newznab mocks answer with NZB results.
    readonly torznabMockIndexerName = "Deterministic Torznab";
    readonly torznabMockApiKey = "deterministic-torznab-key";
    readonly torrentFileQuery = "torrent-system-file";
    readonly torrentFileTitle = "Hydra Deterministic Torrent File";
    readonly torrentFileContent =
        "d4:infod4:name31:Hydra Deterministic Torrent Fileee";
    readonly downloaderIntegrationQuery = "downloader-integration-nzb";
    readonly downloaderIntegrationNzbTitle = "Hydra Downloader Integration NZB";
    readonly downloaderIntegrationNzbContent =
        "Would download NZB with IDdownloader-integration-1";
    readonly uiTestQuery = "uitest";
    readonly uiTestResultTitles = [
        "indexer1-result1",
        "indexer1-result2",
        "indexer1-result3",
        "indexer2-result1",
        "indexer2-result2",
    ];
    readonly searchHistoryQueryPrefix = "nzbget-integration-ui-history-";
    readonly searchHistoryResultTitle = "Hydra NZBGet Integration NZB";
}

export const testEnvironment = new TestEnvironment();
