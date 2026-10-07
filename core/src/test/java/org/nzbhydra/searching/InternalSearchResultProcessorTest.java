

package org.nzbhydra.searching;

import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.nzbhydra.cache.ProxyImageUrlSigner;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.category.Category;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.downloading.FileDownloadRepository;
import org.nzbhydra.downloading.downloadurls.DownloadUrlBuilder;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.dtoseventsenums.SearchResultWebTO;
import org.nzbhydra.searching.dtoseventsenums.SearchResultWebTO.SearchResultWebTOBuilder;
import org.springframework.test.util.ReflectionTestUtils;

import java.net.URI;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
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
}
