package org.nzbhydra.config.validation;

import org.junit.jupiter.api.Test;
import org.nzbhydra.config.auth.UserAuthConfig;
import org.nzbhydra.config.downloading.DownloaderConfig;
import org.nzbhydra.config.indexer.IndexerConfig;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.nzbhydra.config.validation.SensitiveDataConfigValidator.UNCHANGED_MARKER;

class StoredRecordMatcherTest {

    @Test
    void shouldMatchById() {
        IndexerConfig storedA = indexer("a", "A", "keyA");
        IndexerConfig storedB = indexer("b", "B", "keyB");
        IndexerConfig submittedB = indexer("b", "B renamed", UNCHANGED_MARKER);
        IndexerConfig submittedA = indexer("a", "A", UNCHANGED_MARKER);

        List<Object> result = StoredRecordMatcher.matchList(List.of(submittedB, submittedA), List.of(storedA, storedB));

        assertThat(result).containsExactly(storedB, storedA);
    }

    @Test
    void shouldNotMatchByNameWhenIdIsUnknown() {
        IndexerConfig stored = indexer("a", "A", "keyA");
        IndexerConfig submitted = indexer("unknown", "A", UNCHANGED_MARKER);

        List<Object> result = StoredRecordMatcher.matchList(List.of(submitted), List.of(stored));

        assertThat(result).containsExactly((Object) null);
    }

    @Test
    void shouldNotMatchIdSubmittedMoreThanOnce() {
        IndexerConfig stored = indexer("a", "A", "keyA");
        IndexerConfig submitted1 = indexer("a", "A", UNCHANGED_MARKER);
        IndexerConfig submitted2 = indexer("a", "A copy", UNCHANGED_MARKER);

        List<Object> result = StoredRecordMatcher.matchList(List.of(submitted1, submitted2), List.of(stored));

        assertThat(result).containsExactly(null, null);
    }

    @Test
    void shouldMatchRecordWithoutIdByName() {
        IndexerConfig storedA = indexer("a", "A", "keyA");
        IndexerConfig storedB = indexer("b", "B", "keyB");
        IndexerConfig submitted = indexer(null, "B", UNCHANGED_MARKER);

        List<Object> result = StoredRecordMatcher.matchList(List.of(submitted), List.of(storedA, storedB));

        assertThat(result).containsExactly(storedB);
    }

    @Test
    void shouldTreatEmptyIdAsNoId() {
        IndexerConfig stored = indexer("a", "A", "keyA");
        IndexerConfig submitted = indexer("", "A", UNCHANGED_MARKER);

        List<Object> result = StoredRecordMatcher.matchList(List.of(submitted), List.of(stored));

        assertThat(result).containsExactly(stored);
    }

    @Test
    void shouldNotMatchByNameStoredRecordWhoseIdAnotherSubmittedRecordClaims() {
        IndexerConfig stored = indexer("a", "A", "keyA");
        //The user renamed A to "A old" and added a new indexer called A
        IndexerConfig renamed = indexer("a", "A old", UNCHANGED_MARKER);
        IndexerConfig added = indexer(null, "A", UNCHANGED_MARKER);

        List<Object> result = StoredRecordMatcher.matchList(List.of(added, renamed), List.of(stored));

        assertThat(result).containsExactly(null, stored);
    }

    @Test
    void shouldNotMatchByNameStoredRecordWhoseIdIsClaimedEvenIfThatIdMatchedNothing() {
        //A submitted record claims id "a" twice, so neither of them matches, but the stored record is still taken
        IndexerConfig stored = indexer("a", "A", "keyA");
        IndexerConfig claim1 = indexer("a", "X", UNCHANGED_MARKER);
        IndexerConfig claim2 = indexer("a", "Y", UNCHANGED_MARKER);
        IndexerConfig byName = indexer(null, "A", UNCHANGED_MARKER);

        List<Object> result = StoredRecordMatcher.matchList(List.of(claim1, claim2, byName), List.of(stored));

        assertThat(result).containsExactly(null, null, null);
    }

    @Test
    void shouldNotMatchByNameWhenSeveralSubmittedRecordsWithoutIdShareIt() {
        IndexerConfig stored = indexer("a", "A", "keyA");
        IndexerConfig submitted1 = indexer(null, "A", UNCHANGED_MARKER);
        IndexerConfig submitted2 = indexer(null, "A", UNCHANGED_MARKER);

        List<Object> result = StoredRecordMatcher.matchList(List.of(submitted1, submitted2), List.of(stored));

        assertThat(result).containsExactly(null, null);
    }

    @Test
    void shouldNotMatchByNameWhenSeveralStoredRecordsShareIt() {
        IndexerConfig stored1 = indexer("a", "A", "key1");
        IndexerConfig stored2 = indexer("b", "A", "key2");
        IndexerConfig submitted = indexer(null, "A", UNCHANGED_MARKER);

        List<Object> result = StoredRecordMatcher.matchList(List.of(submitted), List.of(stored1, stored2));

        assertThat(result).containsExactly((Object) null);
    }

    @Test
    void shouldMatchByNameWhenOnlyOneOfTwoStoredRecordsWithThatNameIsUnclaimed() {
        IndexerConfig stored1 = indexer("a", "A", "key1");
        IndexerConfig stored2 = indexer("b", "A", "key2");
        IndexerConfig byId = indexer("a", "A", UNCHANGED_MARKER);
        IndexerConfig byName = indexer(null, "A", UNCHANGED_MARKER);

        List<Object> result = StoredRecordMatcher.matchList(List.of(byName, byId), List.of(stored1, stored2));

        assertThat(result).containsExactly(stored2, stored1);
    }

    @Test
    void shouldNeverMatchByPosition() {
        IndexerConfig stored = indexer("a", "A", "keyA");
        IndexerConfig submitted = indexer(null, "B", UNCHANGED_MARKER);

        List<Object> result = StoredRecordMatcher.matchList(List.of(submitted), List.of(stored));

        assertThat(result).containsExactly((Object) null);
    }

    @Test
    void shouldNotMatchRecordWithoutIdOrName() {
        IndexerConfig stored = indexer("a", null, "keyA");
        IndexerConfig submitted = indexer(null, null, UNCHANGED_MARKER);

        List<Object> result = StoredRecordMatcher.matchList(List.of(submitted), List.of(stored));

        assertThat(result).containsExactly((Object) null);
    }

    @Test
    void shouldNotMatchRecordsOfDifferentType() {
        DownloaderConfig stored = new DownloaderConfig();
        stored.setId("a");
        stored.setName("A");
        IndexerConfig submitted = indexer("a", "A", UNCHANGED_MARKER);

        List<Object> result = StoredRecordMatcher.matchList(List.of(submitted), List.of(stored));

        assertThat(result).containsExactly((Object) null);
    }

    @Test
    void shouldHandleNullEntriesAndEmptyStoredList() {
        IndexerConfig stored = indexer("a", "A", "keyA");
        List<IndexerConfig> submitted = Arrays.asList(null, indexer("a", "A", UNCHANGED_MARKER));

        assertThat(StoredRecordMatcher.matchList(submitted, List.of(stored))).containsExactly(null, stored);
        assertThat(StoredRecordMatcher.matchList(submitted, List.of())).containsExactly(null, null);
        assertThat(StoredRecordMatcher.matchList(submitted, null)).containsExactly(null, null);
    }

    @Test
    void shouldMatchUsersByUsername() {
        UserAuthConfig stored = user("u1", "alice", "hash");
        UserAuthConfig submitted = user(null, "alice", UNCHANGED_MARKER);

        assertThat(StoredRecordMatcher.findStoredCounterpart(submitted, List.of(stored))).isSameAs(stored);
    }

    @Test
    void shouldFindNoCounterpartForNull() {
        assertThat(StoredRecordMatcher.findStoredCounterpart(null, List.of(indexer("a", "A", "key")))).isNull();
    }

    @Test
    void shouldResolveUnchangedMarkersFromCounterpart() {
        DownloaderConfig stored = downloader("d", "Sab", "storedKey", "storedUser", "storedPassword");
        DownloaderConfig submitted = downloader("d", "Sab", UNCHANGED_MARKER, "newUser", UNCHANGED_MARKER);

        StoredRecordMatcher.Resolution resolution = StoredRecordMatcher.resolveUnchangedMarkers(submitted, List.of(stored));

        assertThat(resolution.isComplete()).isTrue();
        assertThat(submitted.getApiKey()).isEqualTo("storedKey");
        assertThat(submitted.getUsername()).contains("newUser");
        assertThat(submitted.getPassword()).contains("storedPassword");

        resolution.restoreMarkers(submitted);
        assertThat(submitted.getApiKey()).isEqualTo(UNCHANGED_MARKER);
        assertThat(submitted.getUsername()).contains("newUser");
        assertThat(submitted.getPassword()).contains(UNCHANGED_MARKER);
    }

    @Test
    void shouldBeCompleteWithoutCounterpartWhenNothingIsMarked() {
        DownloaderConfig submitted = downloader(null, "New", "key", "user", "password");

        StoredRecordMatcher.Resolution resolution = StoredRecordMatcher.resolveUnchangedMarkers(submitted, List.of());

        assertThat(resolution.isComplete()).isTrue();
        assertThat(resolution.getUnresolvedFields()).isEmpty();
    }

    @Test
    void shouldLeaveMarkersWithoutCounterpart() {
        DownloaderConfig stored = downloader("d", "Sab", "storedKey", "storedUser", "storedPassword");
        DownloaderConfig submitted = downloader("other", "Sab", UNCHANGED_MARKER, UNCHANGED_MARKER, "password");

        StoredRecordMatcher.Resolution resolution = StoredRecordMatcher.resolveUnchangedMarkers(submitted, List.of(stored));

        assertThat(resolution.isComplete()).isFalse();
        assertThat(resolution.getUnresolvedFields()).containsExactlyInAnyOrder("apiKey", "username");
        assertThat(submitted.getApiKey()).isEqualTo(UNCHANGED_MARKER);
        assertThat(submitted.getUsername()).contains(UNCHANGED_MARKER);
    }

    @Test
    void shouldNotResolveFromEmptyOrMarkedStoredValue() {
        DownloaderConfig stored = downloader("d", "Sab", "", UNCHANGED_MARKER, null);
        DownloaderConfig submitted = downloader("d", "Sab", UNCHANGED_MARKER, UNCHANGED_MARKER, UNCHANGED_MARKER);

        StoredRecordMatcher.Resolution resolution = StoredRecordMatcher.resolveUnchangedMarkers(submitted, List.of(stored));

        assertThat(resolution.getUnresolvedFields()).containsExactlyInAnyOrder("apiKey", "username", "password");
    }

    @Test
    void shouldNameUnresolvedFieldsInFixedOrder() {
        DownloaderConfig submitted = downloader("d", "Sab", UNCHANGED_MARKER, UNCHANGED_MARKER, UNCHANGED_MARKER);

        StoredRecordMatcher.Resolution resolution = StoredRecordMatcher.resolveUnchangedMarkers(submitted, List.of());

        assertThat(resolution.getMessage("downloader", "Sab"))
            .isEqualTo("No saved API key, username and password found for downloader Sab. Please enter the API key, username and password again.");
    }

    @Test
    void shouldNameSingleUnresolvedField() {
        IndexerConfig submitted = indexer("a", "Foo", UNCHANGED_MARKER);

        StoredRecordMatcher.Resolution resolution = StoredRecordMatcher.resolveUnchangedMarkers(submitted, new ArrayList<IndexerConfig>());

        assertThat(resolution.getMessage("indexer", "Foo"))
            .isEqualTo("No saved API key found for indexer Foo. Please enter the API key again.");
    }

    private static IndexerConfig indexer(String id, String name, String apiKey) {
        IndexerConfig config = new IndexerConfig();
        config.setId(id);
        config.setName(name);
        config.setApiKey(apiKey);
        return config;
    }

    private static DownloaderConfig downloader(String id, String name, String apiKey, String username, String password) {
        DownloaderConfig config = new DownloaderConfig();
        config.setId(id);
        config.setName(name);
        config.setApiKey(apiKey);
        config.setUsername(username);
        config.setPassword(password);
        return config;
    }

    private static UserAuthConfig user(String id, String username, String password) {
        UserAuthConfig config = new UserAuthConfig();
        config.setId(id);
        config.setUsername(username);
        config.setPassword(password);
        return config;
    }
}
