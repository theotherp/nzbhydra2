package org.nzbhydra.config;

import org.junit.jupiter.api.Test;
import org.nzbhydra.config.auth.UserAuthConfig;
import org.nzbhydra.config.downloading.DownloaderConfig;
import org.nzbhydra.config.indexer.IndexerConfig;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ConfigRecordIdsTest {

    private static IndexerConfig indexer(String id) {
        final IndexerConfig indexerConfig = new IndexerConfig();
        indexerConfig.setId(id);
        return indexerConfig;
    }

    private static DownloaderConfig downloader(String id) {
        final DownloaderConfig downloaderConfig = new DownloaderConfig();
        downloaderConfig.setId(id);
        return downloaderConfig;
    }

    private static UserAuthConfig user(String id) {
        final UserAuthConfig userAuthConfig = new UserAuthConfig();
        userAuthConfig.setId(id);
        return userAuthConfig;
    }

    @Test
    void shouldAssignIdsToRecordsWithoutOne() {
        final BaseConfig baseConfig = new BaseConfig();
        baseConfig.setIndexers(new ArrayList<>(List.of(indexer("existing"), indexer(null))));
        baseConfig.getDownloading().setDownloaders(new ArrayList<>(List.of(downloader(null))));
        baseConfig.getAuth().setUsers(new ArrayList<>(List.of(user(""))));

        final boolean changed = ConfigRecordIds.ensureUniqueIds(baseConfig);

        assertThat(changed).isTrue();
        assertThat(baseConfig.getIndexers().get(0).getId()).isEqualTo("existing");
        assertThat(baseConfig.getIndexers().get(1).getId()).isNotBlank();
        assertThat(baseConfig.getDownloading().getDownloaders().get(0).getId()).isNotBlank();
        assertThat(baseConfig.getAuth().getUsers().get(0).getId()).isNotBlank();
    }

    @Test
    void shouldReplaceDuplicateIdsKeepingTheFirst() {
        final BaseConfig baseConfig = new BaseConfig();
        baseConfig.getDownloading().setDownloaders(new ArrayList<>(List.of(downloader("same"), downloader("same"), downloader("same"))));

        ConfigRecordIds.ensureUniqueIds(baseConfig);

        final List<DownloaderConfig> downloaders = baseConfig.getDownloading().getDownloaders();
        assertThat(downloaders.get(0).getId()).isEqualTo("same");
        assertThat(new HashSet<>(downloaders.stream().map(DownloaderConfig::getId).toList())).hasSize(3);
    }

    @Test
    void shouldNotChangeUniqueIds() {
        final BaseConfig baseConfig = new BaseConfig();
        baseConfig.setIndexers(new ArrayList<>(List.of(indexer("a"), indexer("b"))));
        baseConfig.getAuth().setUsers(new ArrayList<>(List.of(user("a"))));

        final boolean changed = ConfigRecordIds.ensureUniqueIds(baseConfig);

        assertThat(changed).isFalse();
        assertThat(baseConfig.getIndexers()).extracting(IndexerConfig::getId).containsExactly("a", "b");
        assertThat(baseConfig.getAuth().getUsers().get(0).getId()).isEqualTo("a");
    }
}
