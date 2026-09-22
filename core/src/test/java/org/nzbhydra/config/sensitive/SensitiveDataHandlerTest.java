package org.nzbhydra.config.sensitive;

import org.junit.jupiter.api.Test;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.auth.UserAuthConfig;
import org.nzbhydra.config.downloading.DownloaderConfig;
import org.nzbhydra.config.indexer.IndexerConfig;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SensitiveDataHandlerTest {

    private static final String UNCHANGED_MARKER = "***UNCHANGED***";

    private final SensitiveDataHandler testee = new SensitiveDataHandler();

    private static IndexerConfig indexer(String name, String apiKey) {
        final IndexerConfig indexerConfig = new IndexerConfig();
        indexerConfig.setName(name);
        indexerConfig.setHost("http://" + name);
        indexerConfig.setApiKey(apiKey);
        return indexerConfig;
    }

    private static DownloaderConfig downloader(String name, String apiKey) {
        final DownloaderConfig downloaderConfig = new DownloaderConfig();
        downloaderConfig.setName(name);
        downloaderConfig.setUrl("http://" + name);
        downloaderConfig.setApiKey(apiKey);
        return downloaderConfig;
    }

    @Test
    void shouldClearAFieldWhoseStoredValueIsLiterallyTheUnchangedMarker() {
        final BaseConfig config = new BaseConfig();
        config.setIndexers(List.of(indexer("corrupted", UNCHANGED_MARKER), indexer("fine", "real-key")));

        final List<String> clearedPaths = testee.clearCorruptedUnchangedMarkers(config);

        assertThat(clearedPaths).containsExactly("indexers[0].apiKey");
        assertThat(config.getIndexers().get(0).getApiKey()).isNull();
        assertThat(config.getIndexers().get(1).getApiKey()).isEqualTo("real-key");
    }

    @Test
    void shouldMarkAnIndexerThatLostAFieldAsConfigIncomplete() {
        final BaseConfig config = new BaseConfig();
        final IndexerConfig corrupted = indexer("corrupted", UNCHANGED_MARKER);
        final IndexerConfig fine = indexer("fine", "real-key");
        config.setIndexers(List.of(corrupted, fine));

        testee.clearCorruptedUnchangedMarkers(config);

        assertThat(corrupted.isConfigComplete()).isFalse();
        assertThat(fine.isConfigComplete()).isTrue();
    }

    @Test
    void shouldClearACorruptedFieldEvenWhenItIsNotHiddenInUI() {
        // UserAuthConfig.password is masked/resolved by its own validator rather than @HiddenInUI, but a stored
        // literal marker is corruption there just the same, and the generic save-time rejection scans every String
        // field regardless of the annotation - so the repair has to match that scope.
        final BaseConfig config = new BaseConfig();
        final UserAuthConfig user = new UserAuthConfig();
        user.setUsername("admin");
        user.setPassword(UNCHANGED_MARKER);
        config.getAuth().setUsers(List.of(user));

        final List<String> clearedPaths = testee.clearCorruptedUnchangedMarkers(config);

        assertThat(clearedPaths).containsExactly("auth.users[0].password");
        assertThat(user.getPassword()).isNull();
    }

    @Test
    void shouldClearACorruptedTopLevelNestedField() {
        final BaseConfig config = new BaseConfig();
        config.getMain().setProxyUsername(UNCHANGED_MARKER);
        config.getMain().setProxyPassword("real-proxy-password");

        final List<String> clearedPaths = testee.clearCorruptedUnchangedMarkers(config);

        assertThat(clearedPaths).containsExactly("main.proxyUsername");
        assertThat(config.getMain().getProxyUsername()).isNull();
        assertThat(config.getMain().getProxyPassword()).isEqualTo("real-proxy-password");
    }

    @Test
    void shouldClearACorruptedDownloaderField() {
        final BaseConfig config = new BaseConfig();
        config.getDownloading().setDownloaders(List.of(downloader("corrupted", UNCHANGED_MARKER)));

        final List<String> clearedPaths = testee.clearCorruptedUnchangedMarkers(config);

        assertThat(clearedPaths).containsExactly("downloading.downloaders[0].apiKey");
        assertThat(config.getDownloading().getDownloaders().get(0).getApiKey()).isNull();
    }

    @Test
    void shouldClearEveryCorruptedFieldOnTheSameRecord() {
        final BaseConfig config = new BaseConfig();
        final IndexerConfig indexerConfig = indexer("corrupted", UNCHANGED_MARKER);
        indexerConfig.setUsername(UNCHANGED_MARKER);
        indexerConfig.setPassword(UNCHANGED_MARKER);
        config.setIndexers(List.of(indexerConfig));

        final List<String> clearedPaths = testee.clearCorruptedUnchangedMarkers(config);

        assertThat(clearedPaths).containsExactlyInAnyOrder(
            "indexers[0].apiKey", "indexers[0].username", "indexers[0].password");
        assertThat(indexerConfig.getApiKey()).isNull();
        assertThat(indexerConfig.getUsername()).isEmpty();
        assertThat(indexerConfig.getPassword()).isEmpty();
    }

    @Test
    void shouldReturnNoPathsWhenNothingIsCorrupted() {
        final BaseConfig config = new BaseConfig();
        config.setIndexers(List.of(indexer("fine", "real-key")));

        final List<String> clearedPaths = testee.clearCorruptedUnchangedMarkers(config);

        assertThat(clearedPaths).isEmpty();
    }
}
