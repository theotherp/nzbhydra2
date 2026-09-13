package org.nzbhydra.downloading.downloaders;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.config.downloading.DownloaderConfig;
import org.nzbhydra.config.downloading.NzbAddingType;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.downloading.AddFilesRequest;
import org.nzbhydra.downloading.FileDownloadEntity;
import org.nzbhydra.downloading.FileDownloadStatus;
import org.nzbhydra.downloading.FileHandler;
import org.nzbhydra.downloading.IndexerSpecificDownloadExceptions;
import org.nzbhydra.downloading.downloadurls.DownloadLink;
import org.nzbhydra.downloading.downloadurls.DownloadUrlBuilder;
import org.nzbhydra.downloading.exceptions.DownloaderException;
import org.nzbhydra.downloading.exceptions.DuplicateNzbException;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Behaviour of {@link Downloader#addBySearchResultIds(List, String)}: which IDs end up in which bucket of the
 * response and which messages the user gets to see.
 */
class DownloaderAddBySearchResultIdsTest {

    private final FileHandler fileHandler = mock(FileHandler.class);
    private final SearchResultRepository searchResultRepository = mock(SearchResultRepository.class);
    private final IndexerSpecificDownloadExceptions indexerSpecificDownloadExceptions = mock(IndexerSpecificDownloadExceptions.class);
    private final ConfigProvider configProvider = mock(ConfigProvider.class);
    private final DownloadUrlBuilder downloadUrlBuilder = mock(DownloadUrlBuilder.class);

    private TestDownloader testee;
    private ListAppender<ILoggingEvent> logAppender;
    private ch.qos.logback.classic.Logger downloaderLogger;

    @BeforeEach
    void setUp() {
        testee = new TestDownloader(fileHandler, searchResultRepository, indexerSpecificDownloadExceptions, configProvider, downloadUrlBuilder);
        DownloaderConfig downloaderConfig = new DownloaderConfig();
        downloaderConfig.setName("test downloader");
        downloaderConfig.setNzbAddingType(NzbAddingType.SEND_LINK);
        testee.initialize(downloaderConfig);

        when(configProvider.getBaseConfig()).thenReturn(new BaseConfig());
        when(configProvider.getIndexerByName(anyString())).thenReturn(new IndexerConfig());
        when(downloadUrlBuilder.getDownloadLinkForSendingToDownloader(any(), eq(false))).thenReturn(new DownloadLink("http://internal/link", true));

        logAppender = new ListAppender<>();
        logAppender.start();
        downloaderLogger = (ch.qos.logback.classic.Logger) LoggerFactory.getLogger(Downloader.class);
        downloaderLogger.addAppender(logAppender);
    }

    @AfterEach
    void tearDown() {
        downloaderLogger.detachAppender(logAppender);
        logAppender.stop();
    }

    @Test
    void shouldReportMissedTitlesAndInvalidIdentifiersInTheSameMessage() {
        knownSearchResult(1L, "Some title");
        testee.failure = new DuplicateNzbException("duplicate");

        AddNzbsResponse response = testee.addBySearchResultIds(List.of(entry("1"), entry("not a number")), "Use no category");

        assertThat(response.getMessage()).contains("Some title");
        assertThat(response.getMessage()).contains("Some download identifiers were invalid");
        assertThat(response.getMissedIds()).containsExactly(1L);
        assertThat(response.getInvalidIds()).containsExactly("not a number");
        assertThat(response.getAddedIds()).isEmpty();
    }

    @Test
    void shouldReportUnprocessableResultsAndInvalidIdentifiersInTheSameMessage() {
        when(searchResultRepository.findByHash(1L)).thenReturn(Optional.empty());

        AddNzbsResponse response = testee.addBySearchResultIds(List.of(entry("1"), entry("not a number")), "Use no category");

        assertThat(response.getMessage()).isEqualTo("Some search results could not be processed\r\nSome download identifiers were invalid");
        assertThat(response.getMissedIds()).containsExactly(1L);
        assertThat(response.getInvalidIds()).containsExactly("not a number");
    }

    @Test
    void shouldNotReprocessEntriesHandledBeforeADownloaderErrorOccurred() {
        knownSearchResult(2L, "Some title");
        testee.failure = new DownloaderException("downloader is down");

        AddNzbsResponse response = testee.addBySearchResultIds(List.of(entry("not a number"), entry("2")), "Use no category");

        assertThat(logMessages("Unable to parse download identifier {}")).hasSize(1);
        assertThat(response.isSuccessful()).isFalse();
        assertThat(response.getMessage()).contains("downloader is down");
        assertThat(response.getInvalidIds()).containsExactly("not a number");
        assertThat(response.getMissedIds()).containsExactly(2L);
    }

    @Test
    void shouldMarkAllUnprocessedResultsAsFailedWhenTheDownloaderFails() {
        knownSearchResult(1L, "First");
        knownSearchResult(2L, "Second");
        knownSearchResult(3L, "Third");
        testee.failure = new DownloaderException("downloader is down");
        testee.failFromCall = 1;

        AddNzbsResponse response = testee.addBySearchResultIds(List.of(entry("1"), entry("2"), entry("3")), "Use no category");

        assertThat(response.isSuccessful()).isFalse();
        assertThat(response.getMessage()).isEqualTo("downloader is down.\n1 were added successfully before the error");
        assertThat(response.getAddedIds()).containsExactly(1L);
        assertThat(response.getMissedIds()).containsExactlyInAnyOrder(2L, 3L);
        assertThat(response.getInvalidIds()).isEmpty();
    }

    @Test
    void shouldReportSuccessWithoutMessageWhenEverythingWasAdded() {
        knownSearchResult(1L, "First");

        AddNzbsResponse response = testee.addBySearchResultIds(List.of(entry("1")), "Use no category");

        assertThat(response.isSuccessful()).isTrue();
        assertThat(response.getMessage()).isNull();
        assertThat(response.getAddedIds()).containsExactly(1L);
        assertThat(response.getMissedIds()).isEmpty();
        assertThat(response.getInvalidIds()).isEmpty();
        assertThat(testee.addedLinks).containsExactly("http://internal/link");
    }

    /**
     * A downloader may answer a successful add without an ID we can use. The result still counts as added and the
     * unusable ID must not be remembered, or every later status update would fail on it.
     */
    @Test
    void shouldCountAResultAsAddedAndNotBreakStatusUpdatesWhenTheDownloaderReturnsNoExternalId() {
        SearchResultEntity searchResult = knownSearchResult(1L, "Some title");
        testee.externalId = null;

        AddNzbsResponse response = testee.addBySearchResultIds(List.of(entry("1")), "Use no category");

        assertThat(response.isSuccessful()).isTrue();
        assertThat(response.getAddedIds()).containsExactly(1L);
        assertThat(testee.addedLinks).containsExactly("http://internal/link");

        FileDownloadEntity download = mock(FileDownloadEntity.class);
        when(download.getSearchResult()).thenReturn(searchResult);
        DownloaderEntry downloaderEntry = DownloaderEntry.builder().nzbId("4711").nzbName("Some title").build();
        assertThatCode(() -> testee.isDownloadMatchingDownloaderEntry(download, downloaderEntry)).doesNotThrowAnyException();
    }

    @Test
    void shouldReportSuccessForAnEmptyRequest() {
        AddNzbsResponse response = testee.addBySearchResultIds(Collections.emptyList(), "Use no category");

        assertThat(response.isSuccessful()).isTrue();
        assertThat(response.getMessage()).isNull();
        assertThat(response.getAddedIds()).isEmpty();
        assertThat(response.getMissedIds()).isEmpty();
    }

    @Test
    void shouldTreatDuplicatesAsMissedResults() {
        knownSearchResult(1L, "Some title");
        testee.failure = new DuplicateNzbException("duplicate");

        AddNzbsResponse response = testee.addBySearchResultIds(List.of(entry("1")), "Use no category");

        assertThat(response.isSuccessful()).isFalse();
        assertThat(response.getMessage()).contains("Some title");
        assertThat(response.getMissedIds()).containsExactly(1L);
    }

    @Test
    void shouldUploadContentAndMarkTheDownloadAsAdded() {
        SearchResultEntity searchResult = knownSearchResult(1L, "Some title");
        DownloaderConfig downloaderConfig = new DownloaderConfig();
        downloaderConfig.setName("test downloader");
        downloaderConfig.setNzbAddingType(NzbAddingType.UPLOAD);
        testee.initialize(downloaderConfig);
        BaseConfig baseConfig = new BaseConfig();
        baseConfig.getDownloading().setNzbAccessType(org.nzbhydra.config.downloading.FileDownloadAccessType.PROXY);
        when(configProvider.getBaseConfig()).thenReturn(baseConfig);
        when(indexerSpecificDownloadExceptions.getAccessTypeForIndexer(any(), any(), any())).thenReturn(org.nzbhydra.config.downloading.FileDownloadAccessType.PROXY);
        when(fileHandler.getFileByResult(any(), any(), eq(searchResult))).thenReturn(org.nzbhydra.downloading.DownloadResult.createSuccessfulDownloadResult("Some title", new byte[]{1}, new org.nzbhydra.downloading.FileDownloadEntity()));

        AddNzbsResponse response = testee.addBySearchResultIds(List.of(entry("1")), "Use no category");

        assertThat(response.isSuccessful()).isTrue();
        assertThat(response.getAddedIds()).containsExactly(1L);
        assertThat(testee.addedContentTitles).containsExactly("Some title");
    }

    private List<ILoggingEvent> logMessages(String message) {
        return logAppender.list.stream()
                .filter(x -> x.getLevel() == Level.ERROR)
                .filter(x -> message.equals(x.getMessage()))
                .toList();
    }

    private AddFilesRequest.SearchResult entry(String searchResultId) {
        return new AddFilesRequest.SearchResult(searchResultId, "N/A", "movies");
    }

    private SearchResultEntity knownSearchResult(long hash, String title) {
        SearchResultEntity entity = new SearchResultEntity(new IndexerEntity("indexer"), Instant.now(), title, "guid", "http://link", "http://details", DownloadType.NZB, Instant.now());
        entity.setHash(hash);
        when(searchResultRepository.findByHash(hash)).thenReturn(Optional.of(entity));
        return entity;
    }

    private static class TestDownloader extends Downloader {

        private final List<String> addedLinks = new ArrayList<>();
        private final List<String> addedContentTitles = new ArrayList<>();
        private DownloaderException failure;
        private int failFromCall = 0;
        private int callCount = 0;
        private String externalId = "external-id";

        TestDownloader(FileHandler fileHandler, SearchResultRepository searchResultRepository, IndexerSpecificDownloadExceptions indexerSpecificDownloadExceptions, ConfigProvider configProvider, DownloadUrlBuilder downloadUrlBuilder) {
            super(fileHandler, searchResultRepository, mock(ApplicationEventPublisher.class), indexerSpecificDownloadExceptions, configProvider, downloadUrlBuilder);
        }

        @Override
        public String addLink(String link, String title, DownloadType downloadType, String category) throws DownloaderException {
            int call = callCount++;
            if (failure != null && call >= failFromCall) {
                throw failure;
            }
            addedLinks.add(link);
            return externalId;
        }

        @Override
        public String addContent(byte[] content, String title, DownloadType downloadType, String category) throws DownloaderException {
            int call = callCount++;
            if (failure != null && call >= failFromCall) {
                throw failure;
            }
            addedContentTitles.add(title);
            return externalId;
        }

        @Override
        public GenericResponse checkConnection() {
            return null;
        }

        @Override
        public List<String> getCategories() {
            return Collections.emptyList();
        }

        @Override
        public DownloaderStatus getStatus() {
            return null;
        }

        @Override
        public List<DownloaderEntry> getHistory(Instant earliestDownload) {
            return Collections.emptyList();
        }

        @Override
        public List<DownloaderEntry> getQueue(Instant earliestDownload) {
            return Collections.emptyList();
        }

        @Override
        protected FileDownloadStatus getDownloadStatusFromDownloaderEntry(DownloaderEntry entry, StatusCheckType statusCheckType) {
            return null;
        }
    }

}
