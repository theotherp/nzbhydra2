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

    private static IndexerConfig indexer(String id, String name, String apiKey) {
        final IndexerConfig indexerConfig = indexer(name, apiKey, null, null);
        indexerConfig.setId(id);
        return indexerConfig;
    }

    private static DownloaderConfig downloader(String id, String name, String apiKey) {
        final DownloaderConfig downloaderConfig = downloader(name, apiKey, null, null);
        downloaderConfig.setId(id);
        return downloaderConfig;
    }

    private static UserAuthConfig user(String id, String username, String password) {
        final UserAuthConfig userAuthConfig = user(username, password);
        userAuthConfig.setId(id);
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
    void shouldResolveARenamedRecordByItsIdSoItKeepsItsOwnSecret() {
        final BaseConfig oldConfig = configWith(
            List.of(indexer("id-first", "first", "first-key"), indexer("id-second", "second", "second-key")),
            List.of(), List.of());
        final BaseConfig newConfig = configWith(
            List.of(indexer("id-second", "second", UNCHANGED_MARKER), indexer("id-first", "renamed", UNCHANGED_MARKER)),
            List.of(), List.of());

        testee.prepareForSaving(oldConfig, newConfig);

        assertThat(newConfig.getIndexers().get(0).getApiKey()).isEqualTo("second-key");
        assertThat(newConfig.getIndexers().get(1).getApiKey()).isEqualTo("first-key");
        assertThat(testee.findUnresolvedMarkers(newConfig)).isEmpty();
    }

    @Test
    void shouldKeepEachUsersOwnHashWhenOneIsDeletedOneAddedAndOneRenamed() {
        //Scenario: [alice, bob]; delete alice, add carol, rename bob to robert. The list length is unchanged, which
        //used to hand robert alice's hash by position
        final BaseConfig oldConfig = configWith(List.of(), List.of(),
            List.of(user("id-alice", "alice", "{bcrypt}alice-hash"), user("id-bob", "bob", "{bcrypt}bob-hash")));
        final BaseConfig newConfig = configWith(List.of(), List.of(),
            List.of(user("id-bob", "robert", UNCHANGED_MARKER), user(null, "carol", "{bcrypt}carol-hash")));

        testee.prepareForSaving(oldConfig, newConfig);

        assertThat(newConfig.getAuth().getUsers().get(0).getPassword()).isEqualTo("{bcrypt}bob-hash");
        assertThat(newConfig.getAuth().getUsers().get(1).getPassword()).isEqualTo("{bcrypt}carol-hash");
        assertThat(testee.findUnresolvedMarkers(newConfig)).isEmpty();
    }

    @Test
    void shouldKeepEachIndexersOwnKeyWhenOneIsDeletedOneAddedAndOneRenamed() {
        final BaseConfig oldConfig = configWith(
            List.of(indexer("id-a", "A", "KA"), indexer("id-b", "B", "KB")),
            List.of(), List.of());
        final BaseConfig newConfig = configWith(
            List.of(indexer("id-b", "B renamed", UNCHANGED_MARKER), indexer(null, "C", "KC")),
            List.of(), List.of());

        testee.prepareForSaving(oldConfig, newConfig);

        assertThat(newConfig.getIndexers().get(0).getApiKey()).isEqualTo("KB");
        assertThat(newConfig.getIndexers().get(1).getApiKey()).isEqualTo("KC");
    }

    @Test
    void shouldKeepEachDownloadersOwnKeyWhenOneIsDeletedOneAddedAndOneRenamed() {
        final BaseConfig oldConfig = configWith(List.of(),
            List.of(downloader("id-a", "A", "KA"), downloader("id-b", "B", "KB")), List.of());
        final BaseConfig newConfig = configWith(List.of(),
            List.of(downloader("id-b", "B renamed", UNCHANGED_MARKER), downloader(null, "C", "KC")), List.of());

        testee.prepareForSaving(oldConfig, newConfig);

        assertThat(newConfig.getDownloading().getDownloaders().get(0).getApiKey()).isEqualTo("KB");
        assertThat(newConfig.getDownloading().getDownloaders().get(1).getApiKey()).isEqualTo("KC");
    }

    @Test
    void shouldKeepTheRenamedIndexersOwnKeyWhenItTakesTheNameOfADeletedOne() {
        //Scenario: [A(KA), B(KB)]; delete A, rename B to "A". Matching by name would hand B the deleted A's key
        final BaseConfig oldConfig = configWith(
            List.of(indexer("id-a", "A", "KA"), indexer("id-b", "B", "KB")),
            List.of(), List.of());
        final BaseConfig newConfig = configWith(List.of(indexer("id-b", "A", UNCHANGED_MARKER)), List.of(), List.of());

        testee.prepareForSaving(oldConfig, newConfig);

        assertThat(newConfig.getIndexers().get(0).getApiKey()).isEqualTo("KB");
    }

    @Test
    void shouldKeepTheRenamedUsersOwnHashWhenItTakesTheNameOfADeletedOne() {
        final BaseConfig oldConfig = configWith(List.of(), List.of(),
            List.of(user("id-alice", "alice", "{bcrypt}alice-hash"), user("id-bob", "bob", "{bcrypt}bob-hash")));
        final BaseConfig newConfig = configWith(List.of(), List.of(), List.of(user("id-bob", "alice", UNCHANGED_MARKER)));

        testee.prepareForSaving(oldConfig, newConfig);

        assertThat(newConfig.getAuth().getUsers().get(0).getPassword()).isEqualTo("{bcrypt}bob-hash");
    }

    @Test
    void shouldKeepEachDownloadersOwnKeyWhenTheirNamesAreEqual() {
        //Scenario: two downloaders both named SAB, saved untouched. Matching by name gave both the first one's key
        final BaseConfig oldConfig = configWith(List.of(),
            List.of(downloader("id-1", "SAB", "K1"), downloader("id-2", "SAB", "K2")), List.of());
        final BaseConfig newConfig = configWith(List.of(),
            List.of(downloader("id-1", "SAB", UNCHANGED_MARKER), downloader("id-2", "SAB", UNCHANGED_MARKER)), List.of());

        testee.prepareForSaving(oldConfig, newConfig);

        assertThat(newConfig.getDownloading().getDownloaders().get(0).getApiKey()).isEqualTo("K1");
        assertThat(newConfig.getDownloading().getDownloaders().get(1).getApiKey()).isEqualTo("K2");
    }

    @Test
    void shouldNotResolveEqualNamesOfRecordsWithoutIdBecauseTheyAreAmbiguous() {
        final BaseConfig oldConfig = configWith(List.of(),
            List.of(downloader(null, "SAB", "K1"), downloader(null, "SAB", "K2")), List.of());
        final BaseConfig newConfig = configWith(List.of(),
            List.of(downloader(null, "SAB", UNCHANGED_MARKER), downloader(null, "SAB", UNCHANGED_MARKER)), List.of());

        testee.prepareForSaving(oldConfig, newConfig);

        assertThat(testee.findUnresolvedMarkers(newConfig)).containsExactly("downloading.downloaders[0].apiKey", "downloading.downloaders[1].apiKey");
    }

    @Test
    void shouldMatchARecordWithoutIdByItsName() {
        //API clients may not know about ids
        final BaseConfig oldConfig = configWith(
            List.of(indexer("id-a", "A", "KA"), indexer("id-b", "B", "KB")),
            List.of(), List.of());
        final BaseConfig newConfig = configWith(
            List.of(indexer(null, "B", UNCHANGED_MARKER), indexer(null, "A", UNCHANGED_MARKER)),
            List.of(), List.of());

        testee.prepareForSaving(oldConfig, newConfig);

        assertThat(newConfig.getIndexers().get(0).getApiKey()).isEqualTo("KB");
        assertThat(newConfig.getIndexers().get(1).getApiKey()).isEqualTo("KA");
    }

    @Test
    void shouldNotMatchARecordWithoutIdByNameToAStoredRecordAnotherSubmittedRecordClaimsById() {
        final BaseConfig oldConfig = configWith(
            List.of(indexer("id-a", "A", "KA")),
            List.of(), List.of());
        //"A" was renamed to "A2" and a new record named "A" was added with a marker
        final BaseConfig newConfig = configWith(
            List.of(indexer("id-a", "A2", UNCHANGED_MARKER), indexer(null, "A", UNCHANGED_MARKER)),
            List.of(), List.of());

        testee.prepareForSaving(oldConfig, newConfig);

        assertThat(newConfig.getIndexers().get(0).getApiKey()).isEqualTo("KA");
        assertThat(testee.findUnresolvedMarkers(newConfig)).containsExactly("indexers[1].apiKey");
    }

    @Test
    void shouldRejectANewRecordWithoutIdThatCarriesAMarker() {
        final BaseConfig oldConfig = configWith(List.of(indexer("id-a", "A", "KA")), List.of(), List.of());
        final BaseConfig newConfig = configWith(
            List.of(indexer("id-a", "A", UNCHANGED_MARKER), indexer(null, "New", UNCHANGED_MARKER)),
            List.of(), List.of());

        testee.prepareForSaving(oldConfig, newConfig);

        assertThat(testee.findUnresolvedMarkers(newConfig)).containsExactly("indexers[1].apiKey");
    }

    @Test
    void shouldNotResolveARecordWithAnIdNoStoredRecordHas() {
        final BaseConfig oldConfig = configWith(List.of(indexer("id-a", "A", "KA")), List.of(), List.of());
        final BaseConfig newConfig = configWith(List.of(indexer("id-unknown", "A", UNCHANGED_MARKER)), List.of(), List.of());

        testee.prepareForSaving(oldConfig, newConfig);

        assertThat(newConfig.getIndexers().get(0).getApiKey())
            .as("A record with an id is matched by its id only, never by its name")
            .isEqualTo(UNCHANGED_MARKER);
    }

    @Test
    void shouldNotResolveRecordsSubmittedWithTheSameId() {
        final BaseConfig oldConfig = configWith(List.of(indexer("id-a", "A", "KA")), List.of(), List.of());
        final BaseConfig newConfig = configWith(
            List.of(indexer("id-a", "A", UNCHANGED_MARKER), indexer("id-a", "Copy of A", UNCHANGED_MARKER)),
            List.of(), List.of());

        testee.prepareForSaving(oldConfig, newConfig);

        assertThat(testee.findUnresolvedMarkers(newConfig)).containsExactly("indexers[0].apiKey", "indexers[1].apiKey");
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
    void shouldNotGuessByPositionForARenamedUserWithoutId() {
        //Without an id nothing identifies the renamed user any more. The position is not evidence of identity either,
        //so its marker stays and the save is rejected
        final BaseConfig oldConfig = configWith(List.of(), List.of(),
            List.of(user("rename-me", "{bcrypt}renamed-hash"), user("bystander", "{bcrypt}bystander-hash")));
        final BaseConfig newConfig = configWith(List.of(), List.of(),
            List.of(user("renamed", UNCHANGED_MARKER), user("bystander", UNCHANGED_MARKER)));

        testee.prepareForSaving(oldConfig, newConfig);

        assertThat(newConfig.getAuth().getUsers().get(0).getPassword()).isEqualTo(UNCHANGED_MARKER);
        assertThat(newConfig.getAuth().getUsers().get(1).getPassword()).isEqualTo("{bcrypt}bystander-hash");
    }

    @Test
    void shouldResolveAUserRenameByItsId() {
        final BaseConfig oldConfig = configWith(List.of(), List.of(),
            List.of(user("id-1", "rename-me", "{bcrypt}renamed-hash"), user("id-2", "bystander", "{bcrypt}bystander-hash")));
        final BaseConfig newConfig = configWith(List.of(), List.of(),
            List.of(user("id-1", "renamed", UNCHANGED_MARKER), user("id-2", "bystander", UNCHANGED_MARKER)));

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
