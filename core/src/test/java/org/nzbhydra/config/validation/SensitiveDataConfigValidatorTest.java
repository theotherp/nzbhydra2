package org.nzbhydra.config.validation;

import org.junit.jupiter.api.Test;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.auth.UserAuthConfig;
import org.nzbhydra.config.downloading.DownloaderConfig;
import org.nzbhydra.config.indexer.IndexerConfig;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.nzbhydra.config.validation.SensitiveDataConfigValidator.UNCHANGED_MARKER;

/**
 * Covers the generic {@code @HiddenInUI} pass on its own. It has no collaborators, so it needs no Spring context.
 */
class SensitiveDataConfigValidatorTest {

    private final SensitiveDataConfigValidator testee = new SensitiveDataConfigValidator();

    private static IndexerConfig indexer(String name, String apiKey, String username, String password) {
        final IndexerConfig indexerConfig = new IndexerConfig();
        indexerConfig.setName(name);
        indexerConfig.setApiKey(apiKey);
        indexerConfig.setUsername(username);
        indexerConfig.setPassword(password);
        return indexerConfig;
    }

    private static DownloaderConfig downloader(String name, String apiKey, String username, String password) {
        final DownloaderConfig downloaderConfig = new DownloaderConfig();
        downloaderConfig.setName(name);
        downloaderConfig.setApiKey(apiKey);
        downloaderConfig.setUsername(username);
        downloaderConfig.setPassword(password);
        return downloaderConfig;
    }

    private static UserAuthConfig user(String username, String password) {
        final UserAuthConfig userAuthConfig = new UserAuthConfig();
        userAuthConfig.setUsername(username);
        userAuthConfig.setPassword(password);
        return userAuthConfig;
    }

    private static BaseConfig configWith(List<IndexerConfig> indexers, List<DownloaderConfig> downloaders, List<UserAuthConfig> users) {
        final BaseConfig baseConfig = new BaseConfig();
        baseConfig.setIndexers(new ArrayList<>(indexers));
        baseConfig.getDownloading().setDownloaders(new ArrayList<>(downloaders));
        baseConfig.getAuth().setUsers(new ArrayList<>(users));
        return baseConfig;
    }

    @Test
    void shouldMaskExactlyTheHiddenInUiFieldsForDisplay() {
        final BaseConfig config = configWith(
            List.of(indexer("indexer", "indexer-key", "indexer-user", "indexer-password")),
            List.of(downloader("downloader", "downloader-key", "downloader-user", "downloader-password")),
            List.of(user("alice", "{bcrypt}alice-hash")));
        config.getMain().setProxyUsername("proxy-user");
        config.getMain().setProxyPassword("proxy-password");
        config.getMain().setProxyHost("proxy-host");
        config.getMain().setApiKey("api-key");
        config.getDownloading().getDownloaders().get(0).setUrl("http://downloader");

        testee.prepareForDisplay(config);

        assertThat(config.getMain().getProxyUsername()).isEqualTo(UNCHANGED_MARKER);
        assertThat(config.getMain().getProxyPassword()).isEqualTo(UNCHANGED_MARKER);
        assertThat(config.getIndexers().get(0).getApiKey()).isEqualTo(UNCHANGED_MARKER);
        assertThat(config.getIndexers().get(0).getUsername()).contains(UNCHANGED_MARKER);
        assertThat(config.getIndexers().get(0).getPassword()).contains(UNCHANGED_MARKER);
        assertThat(config.getDownloading().getDownloaders().get(0).getApiKey()).isEqualTo(UNCHANGED_MARKER);
        assertThat(config.getDownloading().getDownloaders().get(0).getUsername()).contains(UNCHANGED_MARKER);
        assertThat(config.getDownloading().getDownloaders().get(0).getPassword()).contains(UNCHANGED_MARKER);

        //Not @HiddenInUI, so this pass must leave them alone
        assertThat(config.getMain().getProxyHost()).isEqualTo("proxy-host");
        assertThat(config.getMain().getApiKey()).isEqualTo("api-key");
        assertThat(config.getDownloading().getDownloaders().get(0).getUrl()).isEqualTo("http://downloader");
        //UserAuthConfigValidator masks this one, not the generic pass
        assertThat(config.getAuth().getUsers().get(0).getPassword()).isEqualTo("{bcrypt}alice-hash");
    }

    @Test
    void shouldResolveMarkersOnEqualLengthListsPositionallySoARenameKeepsItsSecret() {
        final BaseConfig oldConfig = configWith(
            List.of(indexer("first", "first-key", null, null), indexer("second", "second-key", null, null)),
            List.of(), List.of());
        final BaseConfig newConfig = configWith(
            List.of(indexer("renamed", UNCHANGED_MARKER, null, null), indexer("second", UNCHANGED_MARKER, null, null)),
            List.of(), List.of());

        testee.prepareForSaving(oldConfig, newConfig);

        assertThat(newConfig.getIndexers().get(0).getApiKey()).isEqualTo("first-key");
        assertThat(newConfig.getIndexers().get(1).getApiKey()).isEqualTo("second-key");
        assertThat(testee.findUnresolvedMarkers(newConfig)).isEmpty();
    }

    @Test
    void shouldNotMoveAnIndexerSecretOntoItsNeighbourWhenAnEntryIsRemoved() {
        final BaseConfig oldConfig = configWith(
            List.of(indexer("a", "a-key", null, null), indexer("b", "b-key", null, null), indexer("c", "c-key", null, null)),
            List.of(), List.of());
        final BaseConfig newConfig = configWith(
            List.of(indexer("a", UNCHANGED_MARKER, null, null), indexer("c", UNCHANGED_MARKER, null, null)),
            List.of(), List.of());

        testee.prepareForSaving(oldConfig, newConfig);

        assertThat(newConfig.getIndexers().get(0).getApiKey()).isEqualTo("a-key");
        assertThat(newConfig.getIndexers().get(1).getApiKey())
            .as("The entry that shifted into index 1 must keep its own key, not its removed neighbour's")
            .isEqualTo("c-key");
    }

    @Test
    void shouldNotMoveADownloaderSecretOntoItsNeighbourWhenAnEntryIsRemoved() {
        final BaseConfig oldConfig = configWith(List.of(), List.of(
            downloader("a", "a-key", "a-user", "a-password"),
            downloader("b", "b-key", "b-user", "b-password"),
            downloader("c", "c-key", "c-user", "c-password")), List.of());
        final BaseConfig newConfig = configWith(List.of(), List.of(
            downloader("a", UNCHANGED_MARKER, UNCHANGED_MARKER, UNCHANGED_MARKER),
            downloader("c", UNCHANGED_MARKER, UNCHANGED_MARKER, UNCHANGED_MARKER)), List.of());

        testee.prepareForSaving(oldConfig, newConfig);

        final List<DownloaderConfig> downloaders = newConfig.getDownloading().getDownloaders();
        assertThat(downloaders.get(0).getApiKey()).isEqualTo("a-key");
        assertThat(downloaders.get(0).getUsername()).contains("a-user");
        assertThat(downloaders.get(0).getPassword()).contains("a-password");
        assertThat(downloaders.get(1).getApiKey()).isEqualTo("c-key");
        assertThat(downloaders.get(1).getUsername()).contains("c-user");
        assertThat(downloaders.get(1).getPassword()).contains("c-password");
    }

    @Test
    void shouldLeaveTheMarkerInPlaceWhenTheRecordIsUnknownAndTheListLengthChanged() {
        final BaseConfig oldConfig = configWith(List.of(indexer("known", "known-key", null, null)), List.of(), List.of());
        final BaseConfig newConfig = configWith(List.of(
            indexer("known", UNCHANGED_MARKER, null, null),
            indexer("brand new", UNCHANGED_MARKER, null, null)), List.of(), List.of());

        testee.prepareForSaving(oldConfig, newConfig);

        assertThat(newConfig.getIndexers().get(0).getApiKey()).isEqualTo("known-key");
        assertThat(newConfig.getIndexers().get(1).getApiKey())
            .as("There is no stored entry named 'brand new', so nothing may be guessed for it")
            .isEqualTo(UNCHANGED_MARKER);
        assertThat(testee.findUnresolvedMarkers(newConfig)).containsExactly("indexers[1].apiKey");
    }

    @Test
    void shouldNotGuessAnIndexByPositionWhenARenameAccompaniesARemoval() {
        final BaseConfig oldConfig = configWith(
            List.of(indexer("a", "a-key", null, null), indexer("b", "b-key", null, null), indexer("c", "c-key", null, null)),
            List.of(), List.of());
        //"c" was renamed in the same save that removed "b", so no stored entry answers to its new name
        final BaseConfig newConfig = configWith(
            List.of(indexer("a", UNCHANGED_MARKER, null, null), indexer("c renamed", UNCHANGED_MARKER, null, null)),
            List.of(), List.of());

        testee.prepareForSaving(oldConfig, newConfig);

        assertThat(newConfig.getIndexers().get(0).getApiKey()).isEqualTo("a-key");
        assertThat(newConfig.getIndexers().get(1).getApiKey())
            .as("Index 1 holds the removed entry's key in the stored list, which must not be handed to a different record")
            .isEqualTo(UNCHANGED_MARKER);
        assertThat(testee.findUnresolvedMarkers(newConfig)).containsExactly("indexers[1].apiKey");
    }

    @Test
    void shouldIdentifyAUserByItsUsernameWhenTheListLengthChanged() {
        final BaseConfig oldConfig = configWith(List.of(), List.of(),
            List.of(user("alice", "{bcrypt}alice-hash"), user("bob", "{bcrypt}bob-hash")));
        final BaseConfig newConfig = configWith(List.of(), List.of(), List.of(user("bob", UNCHANGED_MARKER)));

        testee.prepareForSaving(oldConfig, newConfig);

        assertThat(newConfig.getAuth().getUsers().get(0).getPassword())
            .as("A UserAuthConfig has no name, so username is what identifies it")
            .isEqualTo("{bcrypt}bob-hash");
    }

    @Test
    void shouldFallBackToTheIndexForAUserRenameOnAnEqualLengthList() {
        //The FM-060 rename-with-bystander case: no username identifies the renamed user any more, but the list is
        //unchanged in length, so the index is still what it was and a plain rename keeps working
        final BaseConfig oldConfig = configWith(List.of(), List.of(),
            List.of(user("rename-me", "{bcrypt}renamed-hash"), user("bystander", "{bcrypt}bystander-hash")));
        final BaseConfig newConfig = configWith(List.of(), List.of(),
            List.of(user("renamed", UNCHANGED_MARKER), user("bystander", UNCHANGED_MARKER)));

        testee.prepareForSaving(oldConfig, newConfig);

        assertThat(newConfig.getAuth().getUsers().get(0).getPassword()).isEqualTo("{bcrypt}renamed-hash");
        assertThat(newConfig.getAuth().getUsers().get(1).getPassword()).isEqualTo("{bcrypt}bystander-hash");
    }

    @Test
    void shouldResolveMarkersOnPlainFieldsRegardlessOfListLengths() {
        final BaseConfig oldConfig = configWith(List.of(), List.of(), List.of());
        oldConfig.getMain().setProxyUsername("proxy-user");
        oldConfig.getMain().setProxyPassword("proxy-password");
        final BaseConfig newConfig = configWith(List.of(), List.of(), List.of());
        newConfig.getMain().setProxyUsername(UNCHANGED_MARKER);
        newConfig.getMain().setProxyPassword(UNCHANGED_MARKER);

        testee.prepareForSaving(oldConfig, newConfig);

        assertThat(newConfig.getMain().getProxyUsername()).isEqualTo("proxy-user");
        assertThat(newConfig.getMain().getProxyPassword()).isEqualTo("proxy-password");
    }

    @Test
    void shouldReportEveryUnresolvedMarkerWithItsSettingPath() {
        final BaseConfig config = configWith(
            List.of(indexer("clean", "real-key", null, null), indexer("dirty", UNCHANGED_MARKER, null, null)),
            List.of(downloader("dirty", UNCHANGED_MARKER, null, null)),
            List.of(user("alice", "{bcrypt}alice-hash"), user("bob", UNCHANGED_MARKER)));
        config.getMain().setProxyPassword(UNCHANGED_MARKER);

        assertThat(testee.findUnresolvedMarkers(config)).containsExactlyInAnyOrderElementsOf(Arrays.asList(
            "main.proxyPassword",
            "indexers[1].apiKey",
            "downloading.downloaders[0].apiKey",
            "auth.users[1].password"));
    }

    @Test
    void shouldReportNoUnresolvedMarkersForAConfigWithoutAny() {
        final BaseConfig config = configWith(
            List.of(indexer("clean", "real-key", "real-user", "real-password")),
            List.of(downloader("clean", "real-key", "real-user", "real-password")),
            List.of(user("alice", "{bcrypt}alice-hash")));

        assertThat(testee.findUnresolvedMarkers(config)).isEmpty();
    }
}
