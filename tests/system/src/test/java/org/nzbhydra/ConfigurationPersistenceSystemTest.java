package org.nzbhydra;

import org.junit.jupiter.api.Test;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.downloading.DownloaderConfig;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.validation.ConfigValidationResult;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Every test here replaces the stored configuration, and none of them puts anything back.
 *
 * <p>That is the point of {@link BaselineExtension}: it establishes {@link BeforeAll#applyBaseline()}'s configuration
 * before each of these tests and once more after the class, so the API key, the mock indexers, the mock downloader and
 * the plain {@code main} flags these tests toggle ({@code showNews}, {@code disableTour}) are all a precondition rather
 * than a debt each test owes its successor. The class used to carry a hand-written {@code @BeforeEach}/{@code @AfterEach}
 * pair doing exactly this, and the flags it had to restore by hand are the ones FM-134 found leaking into the Playwright
 * phase one Maven phase later (.github/workflows/system-test.yml).
 */
@SystemTest
public class ConfigurationPersistenceSystemTest {

    @Autowired
    private HydraClient hydraClient;

    @Test
    public void shouldPersistConfigurationChanges() {
        BaseConfig config = getConfig();
        boolean changedValue = !config.getMain().isDisableTour();
        config.getMain().setDisableTour(changedValue);

        assertSuccessfulSave(config);

        assertThat(getConfig().getMain().isDisableTour()).isEqualTo(changedValue);
    }

    @Test
    public void shouldRejectInvalidConfigurationWithoutReplacingCurrentConfiguration() {
        BaseConfig validConfig = getConfig();
        List<String> validIndexerNames = validConfig.getIndexers().stream().map(IndexerConfig::getName).toList();
        assertThat(validConfig.getIndexers()).hasSizeGreaterThanOrEqualTo(2);

        String duplicateName = "duplicate-indexer-" + UUID.randomUUID();
        validConfig.getIndexers().get(0).setName(duplicateName);
        validConfig.getIndexers().get(1).setName(duplicateName);

        HydraResponse response = hydraClient.put("/internalapi/config", validConfig);
        ConfigValidationResult validationResult = response.as(ConfigValidationResult.class);

        assertThat(response.status()).isEqualTo(200);
        assertThat(validationResult.isOk()).isFalse();
        assertThat(validationResult.getErrorMessages())
                .anySatisfy(error -> assertThat(error).containsIgnoringCase("duplicate indexer names"));
        assertThat(getConfig().getIndexers()).extracting(IndexerConfig::getName).containsExactlyElementsOf(validIndexerNames);
    }

    @Test
    public void shouldReturnRedactedSafeConfiguration() {
        BaseConfig config = getConfig();
        String mainApiKeyMarker = "main-api-key-" + UUID.randomUUID();
        String indexerApiKeyMarker = "indexer-api-key-" + UUID.randomUUID();
        String downloaderApiKeyMarker = "downloader-api-key-" + UUID.randomUUID();
        assertThat(config.getIndexers()).isNotEmpty();

        config.getMain().setApiKey(mainApiKeyMarker);
        config.getIndexers().get(0).setApiKey(indexerApiKeyMarker);
        if (!config.getDownloading().getDownloaders().isEmpty()) {
            DownloaderConfig downloader = config.getDownloading().getDownloaders().get(0);
            downloader.setApiKey(downloaderApiKeyMarker);
        }
        assertSuccessfulSave(config);

        String safeConfig = hydraClient.get("/internalapi/config/safe").body();
        var safeConfigTree = Jackson.JSON_MAPPER.readTree(safeConfig);

        assertThat(safeConfigTree.has("showNews")).isTrue();
        assertThat(safeConfigTree.has("indexers")).isTrue();
        assertThat(safeConfigTree.get("indexers").size()).isEqualTo(config.getIndexers().size());
        assertThat(safeConfig).doesNotContain(mainApiKeyMarker, indexerApiKeyMarker, downloaderApiKeyMarker);
    }

    @Test
    public void shouldReloadConfigurationFromDisk() {
        BaseConfig config = getConfig();
        boolean changedValue = !config.getMain().isShowNews();
        config.getMain().setShowNews(changedValue);
        assertSuccessfulSave(config);

        HydraResponse reloadResponse = hydraClient.get("/internalapi/config/reload");
        GenericResponse reloadResult = reloadResponse.as(GenericResponse.class);

        assertThat(reloadResponse.status()).isEqualTo(200);
        assertThat(reloadResult.isSuccessful()).isTrue();
        assertThat(getConfig().getMain().isShowNews()).isEqualTo(changedValue);
    }

    private BaseConfig getConfig() {
        HydraResponse response = hydraClient.get("/internalapi/config");
        assertThat(response.status()).isEqualTo(200);
        return response.as(BaseConfig.class);
    }

    private void assertSuccessfulSave(BaseConfig config) {
        HydraResponse response = hydraClient.put("/internalapi/config", config);
        ConfigValidationResult validationResult = response.as(ConfigValidationResult.class);

        assertThat(response.status()).isEqualTo(200);
        assertThat(validationResult.isOk()).isTrue();
        assertThat(validationResult.getErrorMessages()).isEmpty();
        assertThat(validationResult.getNewConfig()).isNotNull();
    }
}
