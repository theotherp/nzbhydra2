package org.nzbhydra.externalapi;

import org.junit.jupiter.api.Test;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.config.downloading.FileDownloadAccessType;
import org.nzbhydra.config.notification.NotificationEventType;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.downloading.FileDownloadEntity;
import org.nzbhydra.downloading.FileDownloadStatus;
import org.nzbhydra.externalapi.v1.ExternalDownloadHistoryEntry;
import org.nzbhydra.externalapi.v1.ExternalIdentifier;
import org.nzbhydra.externalapi.v1.ExternalNotificationHistoryEntry;
import org.nzbhydra.externalapi.v1.ExternalPage;
import org.nzbhydra.externalapi.v1.ExternalSearchHistoryEntry;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.notifications.NotificationEntity;
import org.nzbhydra.notifications.NotificationMessageType;
import org.nzbhydra.searching.db.IdentifierKeyValuePair;
import org.nzbhydra.searching.db.SearchEntity;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Field by field for one populated instance of every entity the history returns.
 */
class ExternalHistoryMapperTest {

    private static final Instant TIME = Instant.parse("2026-09-09T12:00:00Z");

    private final ExternalHistoryMapper testee = new ExternalHistoryMapper();

    @Test
    void shouldMapEveryFieldOfASearchEntity() {
        SearchEntity entity = new SearchEntity();
        ReflectionTestUtils.setField(entity, "id", 12);
        entity.setTime(TIME);
        entity.setSource(SearchSource.API);
        entity.setSearchType(SearchType.TVSEARCH);
        entity.setCategoryName("TV HD");
        entity.setQuery("some query");
        entity.setTitle("some title");
        entity.setAuthor("some author");
        entity.setSeason(3);
        entity.setEpisode("4");
        entity.setMinAge(1);
        entity.setMaxAge(100);
        entity.setMinSize(10);
        entity.setMaxSize(1000);
        entity.setIdentifiers(new LinkedHashSet<>(List.of(
                new IdentifierKeyValuePair("TVDB", "12345"),
                new IdentifierKeyValuePair("IMDB", "tt0111161"))));
        entity.setSelectedIndexers(new LinkedHashSet<>(List.of("zIndexer", "aIndexer")));
        entity.setUsername("theuser");
        entity.setIp("10.0.0.1");
        entity.setUserAgent("Sonarr");

        ExternalSearchHistoryEntry entry = testee.toSearchEntry(entity);

        assertThat(entry.getId()).isEqualTo(12);
        assertThat(entry.getTime()).isEqualTo(TIME);
        assertThat(entry.getSource()).isEqualTo("API");
        assertThat(entry.getSearchType()).isEqualTo("TVSEARCH");
        assertThat(entry.getCategory()).isEqualTo("TV HD");
        assertThat(entry.getQuery()).isEqualTo("some query");
        assertThat(entry.getTitle()).isEqualTo("some title");
        assertThat(entry.getAuthor()).isEqualTo("some author");
        assertThat(entry.getSeason()).isEqualTo(3);
        assertThat(entry.getEpisode()).isEqualTo("4");
        assertThat(entry.getMinAge()).isEqualTo(1);
        assertThat(entry.getMaxAge()).isEqualTo(100);
        assertThat(entry.getMinSize()).isEqualTo(10);
        assertThat(entry.getMaxSize()).isEqualTo(1000);
        assertThat(entry.getIdentifiers()).containsExactly(
                new ExternalIdentifier("IMDB", "tt0111161"),
                new ExternalIdentifier("TVDB", "12345"));
        assertThat(entry.getSelectedIndexers()).containsExactly("aIndexer", "zIndexer");
        assertThat(entry.getUsername()).isEqualTo("theuser");
        assertThat(entry.getIp()).isEqualTo("10.0.0.1");
        assertThat(entry.getUserAgent()).isEqualTo("Sonarr");
    }

    @Test
    void shouldMapEveryFieldOfADownloadEntity() {
        IndexerEntity indexer = new IndexerEntity();
        indexer.setName("anIndexer");
        SearchResultEntity searchResult = new SearchResultEntity(indexer, TIME, "the result title", "guid", "link",
                "details", DownloadType.NZB, TIME);
        FileDownloadEntity entity = new FileDownloadEntity();
        ReflectionTestUtils.setField(entity, "id", 34);
        entity.setSearchResult(searchResult);
        entity.setTime(TIME);
        entity.setNzbAccessType(FileDownloadAccessType.PROXY);
        entity.setAccessSource(SearchSource.INTERNAL);
        entity.setStatus(FileDownloadStatus.NZB_ADDED);
        entity.setError("some error");
        entity.setExternalId("SABnzbd_nzo_12345");
        entity.setAge(42);
        entity.setUsername("theuser");
        entity.setIp("10.0.0.1");
        entity.setUserAgent("Radarr");

        ExternalDownloadHistoryEntry entry = testee.toDownloadEntry(entity);

        assertThat(entry.getId()).isEqualTo(34);
        assertThat(entry.getTime()).isEqualTo(TIME);
        assertThat(entry.getTitle()).isEqualTo("the result title");
        assertThat(entry.getIndexer()).isEqualTo("anIndexer");
        //Neither is stored with a download
        assertThat(entry.getCategory()).isNull();
        assertThat(entry.getSizeBytes()).isNull();
        assertThat(entry.getAgeDays()).isEqualTo(42);
        assertThat(entry.getAccessType()).isEqualTo("PROXY");
        assertThat(entry.getAccessSource()).isEqualTo("INTERNAL");
        assertThat(entry.getStatus()).isEqualTo("NZB_ADDED");
        assertThat(entry.getError()).isEqualTo("some error");
        assertThat(entry.getExternalId()).isEqualTo("SABnzbd_nzo_12345");
        assertThat(entry.getUsername()).isEqualTo("theuser");
        assertThat(entry.getIp()).isEqualTo("10.0.0.1");
        assertThat(entry.getUserAgent()).isEqualTo("Radarr");
    }

    /**
     * A download whose search result was deleted still has to be listed rather than blowing up the whole page.
     */
    @Test
    void shouldMapADownloadWithoutASearchResult() {
        FileDownloadEntity entity = new FileDownloadEntity();
        entity.setStatus(FileDownloadStatus.NONE);

        ExternalDownloadHistoryEntry entry = testee.toDownloadEntry(entity);

        assertThat(entry.getTitle()).isNull();
        assertThat(entry.getIndexer()).isNull();
        assertThat(entry.getStatus()).isEqualTo("NONE");
    }

    @Test
    void shouldMapEveryFieldOfANotificationEntity() {
        NotificationEntity entity = new NotificationEntity(NotificationEventType.RESULT_DOWNLOAD,
                NotificationMessageType.INFO, "the title", "the body", "mailto://one, json://two", TIME);
        ReflectionTestUtils.setField(entity, "id", 56);
        entity.setDisplayed(true);

        ExternalNotificationHistoryEntry entry = testee.toNotificationEntry(entity);

        assertThat(entry.getId()).isEqualTo(56);
        assertThat(entry.getTime()).isEqualTo(TIME);
        assertThat(entry.getEventType()).isEqualTo("RESULT_DOWNLOAD");
        assertThat(entry.getMessageType()).isEqualTo("INFO");
        assertThat(entry.getTitle()).isEqualTo("the title");
        assertThat(entry.getBody()).isEqualTo("the body");
        assertThat(entry.getUrls()).containsExactly("mailto://one", "json://two");
        assertThat(entry.isDisplayed()).isTrue();
    }

    @Test
    void shouldSplitTheAppriseUrlsOnCommasAndLineBreaks() {
        assertThat(testee.toUrls(null)).isEmpty();
        assertThat(testee.toUrls("  ")).isEmpty();
        assertThat(testee.toUrls("one")).containsExactly("one");
        assertThat(testee.toUrls("one,two\nthree\r\nfour,,")).containsExactly("one", "two", "three", "four");
    }

    @Test
    void shouldTurnASpringPageIntoTheContractsOwnEnvelope() {
        SearchEntity first = new SearchEntity();
        first.setQuery("first");
        SearchEntity second = new SearchEntity();
        second.setQuery("second");

        ExternalPage<ExternalSearchHistoryEntry> page = testee.toPage(
                new PageImpl<>(List.of(first, second), PageRequest.of(1, 2), 7), 2, 2, testee::toSearchEntry);

        assertThat(page.getPage()).isEqualTo(2);
        assertThat(page.getLimit()).isEqualTo(2);
        assertThat(page.getTotalElements()).isEqualTo(7);
        assertThat(page.getTotalPages()).isEqualTo(4);
        assertThat(page.getEntries()).extracting(ExternalSearchHistoryEntry::getQuery).containsExactly("first", "second");
    }

    @Test
    void shouldMapEmptyCollectionsRatherThanNull() {
        SearchEntity entity = new SearchEntity();
        entity.setIdentifiers(Set.of());
        entity.setSelectedIndexers(null);

        ExternalSearchHistoryEntry entry = testee.toSearchEntry(entity);

        assertThat(entry.getIdentifiers()).isEmpty();
        assertThat(entry.getSelectedIndexers()).isEmpty();
    }
}
