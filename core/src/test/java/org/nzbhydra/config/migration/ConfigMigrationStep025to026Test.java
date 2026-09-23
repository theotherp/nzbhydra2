package org.nzbhydra.config.migration;

import org.junit.jupiter.api.Test;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.auth.UserAuthConfig;
import org.nzbhydra.config.downloading.DownloaderConfig;
import org.nzbhydra.config.indexer.IndexerConfig;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

class ConfigMigrationStep025to026Test {

    private final ConfigMigrationStep025to026 testee = new ConfigMigrationStep025to026();

    private final TypeReference<HashMap<String, Object>> typeRef = new TypeReference<>() {
    };
    private final ObjectMapper objectMapper = new JsonMapper();

    private static IndexerConfig indexer(String id, String name) {
        final IndexerConfig indexerConfig = new IndexerConfig();
        indexerConfig.setId(id);
        indexerConfig.setName(name);
        return indexerConfig;
    }

    private static DownloaderConfig downloader(String id, String name) {
        final DownloaderConfig downloaderConfig = new DownloaderConfig();
        downloaderConfig.setId(id);
        downloaderConfig.setName(name);
        return downloaderConfig;
    }

    private static UserAuthConfig user(String id, String username) {
        final UserAuthConfig userAuthConfig = new UserAuthConfig();
        userAuthConfig.setId(id);
        userAuthConfig.setUsername(username);
        return userAuthConfig;
    }

    @Test
    void shouldAssignUniqueIdsToEveryIndexerDownloaderAndUser() {
        final BaseConfig input = new BaseConfig();
        input.setIndexers(new ArrayList<>(List.of(indexer(null, "a"), indexer(null, "b"))));
        input.getDownloading().setDownloaders(new ArrayList<>(List.of(downloader(null, "sab"), downloader(null, "sab"))));
        input.getAuth().setUsers(new ArrayList<>(List.of(user(null, "alice"), user(null, "bob"))));
        final Map<String, Object> map = objectMapper.convertValue(input, typeRef);

        final BaseConfig result = objectMapper.convertValue(testee.migrate(map), BaseConfig.class);

        final List<String> ids = Stream.of(
                result.getIndexers().stream().map(IndexerConfig::getId),
                result.getDownloading().getDownloaders().stream().map(DownloaderConfig::getId),
                result.getAuth().getUsers().stream().map(UserAuthConfig::getId))
            .flatMap(x -> x)
            .toList();
        assertThat(ids).hasSize(6).doesNotContainNull().allSatisfy(id -> assertThat(id).isNotBlank());
        assertThat(new HashSet<>(ids)).hasSize(6);
    }

    @Test
    void shouldKeepExistingIdsAndReplaceDuplicateOrEmptyOnes() {
        final BaseConfig input = new BaseConfig();
        input.setIndexers(new ArrayList<>(List.of(indexer("keep-me", "a"), indexer("keep-me", "b"), indexer("", "c"))));
        final Map<String, Object> map = objectMapper.convertValue(input, typeRef);

        final BaseConfig result = objectMapper.convertValue(testee.migrate(map), BaseConfig.class);

        final List<IndexerConfig> indexers = result.getIndexers();
        assertThat(indexers.get(0).getId()).isEqualTo("keep-me");
        assertThat(indexers.get(1).getId()).isNotBlank().isNotEqualTo("keep-me");
        assertThat(indexers.get(2).getId()).isNotBlank();
        final Set<String> ids = new HashSet<>(indexers.stream().map(IndexerConfig::getId).toList());
        assertThat(ids).hasSize(3);
    }

    @Test
    void shouldHandleAConfigWithoutAnyRecords() {
        final Map<String, Object> map = objectMapper.convertValue(new BaseConfig(), typeRef);

        final BaseConfig result = objectMapper.convertValue(testee.migrate(map), BaseConfig.class);

        assertThat(result.getIndexers()).isEmpty();
        assertThat(result.getAuth().getUsers()).isEmpty();
    }

    @Test
    void shouldBeForVersion25() {
        assertThat(testee.forVersion()).isEqualTo(25);
    }
}
