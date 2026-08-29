package org.nzbhydra;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.downloading.DownloaderConfig;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.validation.ConfigValidationResult;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ContextConfiguration;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ContextConfiguration(classes = {TestConfig.class})
public class ConfigurationPersistenceSystemTest {

    @Autowired
    private HydraClient hydraClient;

    @Autowired
    private BeforeAll beforeAll;

    @BeforeEach
    public void setUp() {
        // Establish the baseline this test needs instead of inheriting whatever ran before it.
        beforeAll.applyBaseline();
    }

    @AfterEach
    public void restoreConfiguration() {
        // Re-apply the baseline rather than putting back a snapshot from GET: that snapshot carries
        // ***UNCHANGED*** secret markers, and since FM-068 a save is refused when a marker cannot be
        // matched to a stored record - exactly the case once this test replaced those records.
        beforeAll.applyBaseline();
    }

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
