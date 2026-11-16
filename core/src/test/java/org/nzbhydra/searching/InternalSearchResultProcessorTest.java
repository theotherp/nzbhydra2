

package org.nzbhydra.searching;

import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.nzbhydra.cache.ProxyImageUrlSigner;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.category.Category;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.downloading.FileDownloadEntity;
import org.nzbhydra.downloading.FileDownloadRepository;
import org.nzbhydra.downloading.downloadurls.DownloadUrlBuilder;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.indexers.status.IndexerStatusesAndLimits;
import org.nzbhydra.indexers.status.IndexerStatusesAndLimits.IndexerStatus;
import org.nzbhydra.searching.IndexerForSearchSelector.IndexerForSearchSelection;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.dtoseventsenums.SearchResultWebTO;
import org.nzbhydra.searching.dtoseventsenums.SearchResultWebTO.SearchResultWebTOBuilder;
import org.springframework.test.util.ReflectionTestUtils;

import java.net.URI;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.stream.LongStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class InternalSearchResultProcessorTest {

    @InjectMocks
    private InternalSearchResultProcessor testee = new InternalSearchResultProcessor();


    @Test
    void setSearchResultDateRelatedValues() {

        SearchResultWebTOBuilder builder = SearchResultWebTO.builder();
        SearchResultItem item = new SearchResultItem();
        item.setPubDate(Instant.now().minus(100, ChronoUnit.DAYS)); //Should be ignored when usenet date is set

        item.setUsenetDate(Instant.now().minus(10, ChronoUnit.DAYS));
        builder = testee.setSearchResultDateRelatedValues(builder, item);
        assertThat(builder.build().getAge()).isEqualTo("10d");

        item.setUsenetDate(Instant.now().minus(10, ChronoUnit.HOURS));
        builder = testee.setSearchResultDateRelatedValues(builder, item);
        assertThat(builder.build().getAge()).isEqualTo("10h");

        item.setUsenetDate(Instant.now().minus(10, ChronoUnit.MINUTES));
        builder = testee.setSearchResultDateRelatedValues(builder, item);
        assertThat(builder.build().getAge()).isEqualTo("10m");

        item.setUsenetDate(null);
        builder = testee.setSearchResultDateRelatedValues(builder, item);
        assertThat(builder.build().getAge()).isEqualTo("100d");
    }

    @Test
    void shouldIssueVerifiableProxiedCoverUrlsAndLeaveThePosterAlone() {
        BaseConfig baseConfig = new BaseConfig();
        baseConfig.getMain().setProxyImages(true);
        ConfigProvider configProvider = mock(ConfigProvider.class);
        when(configProvider.getBaseConfig()).thenReturn(baseConfig);
        ProxyImageUrlSigner signer = new ProxyImageUrlSigner();
        ReflectionTestUtils.setField(signer, "configProvider", configProvider);

        InternalSearchResultProcessor processor = new InternalSearchResultProcessor();
        ReflectionTestUtils.setField(processor, "configProvider", configProvider);
        ReflectionTestUtils.setField(processor, "proxyImageUrlSigner", signer);
        ReflectionTestUtils.setField(processor, "fileDownloadRepository", mock(FileDownloadRepository.class));
        ReflectionTestUtils.setField(processor, "downloadUrlBuilder", mock(DownloadUrlBuilder.class));

        Indexer indexer = mock(Indexer.class);
        when(indexer.getName()).thenReturn("indexer");
        when(indexer.getConfig()).thenReturn(new IndexerConfig());
        SearchResultItem item = new SearchResultItem();
        item.setCategory(new Category("Movies"));
        item.setDownloadType(DownloadType.NZB);
        item.setIndexer(indexer);
        item.setSearchResultId(1L);
        item.setSearchId(2);
        item.setTitle("title");
        item.setPubDate(Instant.now());
        item.setCover("https://example.com/cover.jpg");
        item.setPoster("uploader@example.com");

        SearchResultWebTO result = processor.transformSearchResults(List.of(item)).get(0);

        assertThat(result.getCover()).startsWith("cache/");
        String[] segments = result.getCover().substring("cache/".length()).split("/");
        assertThat(signer.verify(segments[0], segments[1])).contains(URI.create("https://example.com/cover.jpg"));
        assertThat(result.getPoster()).isEqualTo("uploader@example.com");

        baseConfig.getMain().setProxyImages(false);
        assertThat(processor.transformSearchResults(List.of(item)).get(0).getCover()).isEqualTo("https://example.com/cover.jpg");
    }

    @Test
    void shouldUseFirstReturnedDownloadWhenSeveralExistForOneResult() {
        FileDownloadRepository repository = mock(FileDownloadRepository.class);
        InternalSearchResultProcessor processor = createProcessor(new BaseConfig(), repository);
        Instant firstTime = Instant.parse("2026-01-02T10:15:00Z");
        Instant secondTime = Instant.parse("2026-03-04T20:30:00Z");
        when(repository.findBySearchResult_HashIn(anyCollection())).thenReturn(List.of(
                download(1L, firstTime),
                download(2L, Instant.parse("2026-05-06T07:08:00Z")),
                download(1L, secondTime)
        ));

        List<SearchResultWebTO> results = processor.transformSearchResults(List.of(item(1L), item(2L), item(3L)));

        assertThat(results).extracting(SearchResultWebTO::getSearchResultId, SearchResultWebTO::getDownloadedAt)
                .containsExactlyInAnyOrder(
                        tuple("1", "02-01-2026 10:15"),
                        tuple("2", "06-05-2026 07:08"),
                        tuple("3", null)
                );
    }

    @Test
    void shouldLookUpDownloadsInChunks() {
        FileDownloadRepository repository = mock(FileDownloadRepository.class);
        InternalSearchResultProcessor processor = createProcessor(new BaseConfig(), repository);
        List<List<Long>> queriedChunks = new ArrayList<>();
        when(repository.findBySearchResult_HashIn(anyCollection())).thenAnswer(invocation -> {
            Collection<Long> hashes = invocation.getArgument(0);
            queriedChunks.add(new ArrayList<>(hashes));
            return hashes.contains(2345L) ? List.of(download(2345L, Instant.parse("2026-01-02T10:15:00Z"))) : List.of();
        });
        List<SearchResultItem> items = LongStream.rangeClosed(1, 2500).mapToObj(InternalSearchResultProcessorTest::item).toList();

        List<SearchResultWebTO> results = processor.transformSearchResults(items);

        assertThat(queriedChunks).extracting(List::size).containsExactly(1000, 1000, 500);
        assertThat(queriedChunks.stream().flatMap(List::stream).toList())
                .containsExactlyElementsOf(LongStream.rangeClosed(1, 2500).boxed().toList());
        assertThat(results).hasSize(2500);
        assertThat(results).filteredOn(x -> x.getDownloadedAt() != null)
                .extracting(SearchResultWebTO::getSearchResultId)
                .containsExactly("2345");
    }

    @Test
    void shouldOnlyLoadLimitStatusesOfSearchedIndexersAndKeepTheirOrder() {
        BaseConfig baseConfig = new BaseConfig();
        baseConfig.getNotificationConfig().setIndexerHitLimitWarningThreshold(10);
        baseConfig.getNotificationConfig().setIndexerDownloadLimitWarningThreshold(5);
        FileDownloadRepository repository = mock(FileDownloadRepository.class);
        InternalSearchResultProcessor processor = createProcessor(baseConfig, repository);
        IndexerStatusesAndLimits statuses = mock(IndexerStatusesAndLimits.class);
        ReflectionTestUtils.setField(processor, "indexerStatusesAndLimits", statuses);
        when(statuses.getSortedStatuses(Set.of("zulu", "alpha"))).thenReturn(List.of(
                status("zulu", 100, 95, 10, 7),
                status("alpha", 100, 91, 10, 10)
        ));

        SearchResult searchResult = new SearchResult();
        searchResult.setIndexerSelectionResult(new IndexerForSearchSelection());
        searchResult.getIndexerSearchResults().add(new IndexerSearchResult(indexer("zulu"), true));
        searchResult.getIndexerSearchResults().add(new IndexerSearchResult(indexer("alpha"), true));

        SearchResponse response = processor.createSearchResponse(searchResult);

        assertThat(response.getIndexerLimitWarnings()).containsExactly(
                "zulu has 5 API hits left.",
                "zulu has 3 downloads left.",
                "alpha has 9 API hits left.",
                "alpha has 0 downloads left."
        );
        verify(statuses, never()).getSortedStatuses();
        verify(repository, never()).findBySearchResult_HashIn(any());
    }

    private static InternalSearchResultProcessor createProcessor(BaseConfig baseConfig, FileDownloadRepository repository) {
        ConfigProvider configProvider = mock(ConfigProvider.class);
        when(configProvider.getBaseConfig()).thenReturn(baseConfig);
        ProxyImageUrlSigner signer = new ProxyImageUrlSigner();
        ReflectionTestUtils.setField(signer, "configProvider", configProvider);
        InternalSearchResultProcessor processor = new InternalSearchResultProcessor();
        ReflectionTestUtils.setField(processor, "configProvider", configProvider);
        ReflectionTestUtils.setField(processor, "proxyImageUrlSigner", signer);
        ReflectionTestUtils.setField(processor, "fileDownloadRepository", repository);
        ReflectionTestUtils.setField(processor, "downloadUrlBuilder", mock(DownloadUrlBuilder.class));
        return processor;
    }

    private static Indexer indexer(String name) {
        Indexer indexer = mock(Indexer.class);
        when(indexer.getName()).thenReturn(name);
        when(indexer.getConfig()).thenReturn(new IndexerConfig());
        return indexer;
    }

    private static SearchResultItem item(long hash) {
        SearchResultItem item = new SearchResultItem();
        item.setCategory(new Category("Movies"));
        item.setDownloadType(DownloadType.NZB);
        item.setIndexer(indexer("indexer"));
        item.setGuid(hash);
        item.setSearchResultId(hash);
        item.setSearchId(2);
        item.setTitle("title" + hash);
        item.setPubDate(Instant.now());
        return item;
    }

    private static FileDownloadEntity download(long hash, Instant time) {
        SearchResultEntity searchResult = new SearchResultEntity();
        searchResult.setHash(hash);
        FileDownloadEntity download = new FileDownloadEntity();
        download.setSearchResult(searchResult);
        download.setTime(time);
        return download;
    }

    private static IndexerStatus status(String name, int apiHitLimit, int apiHits, int downloadLimit, int downloads) {
        IndexerStatus status = new IndexerStatus();
        status.setIndexer(name);
        status.setApiHitLimit(apiHitLimit);
        status.setApiHits(apiHits);
        status.setDownloadHitLimit(downloadLimit);
        status.setDownloadHits(downloads);
        return status;
    }
}
