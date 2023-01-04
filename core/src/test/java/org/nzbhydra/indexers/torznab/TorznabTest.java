/*
 *  (C) Copyright 2017 TheOtherP (theotherp@posteo.net)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.nzbhydra.indexers.torznab;

import com.google.common.collect.Lists;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.invocation.InvocationOnMock;
import org.mockito.stubbing.Answer;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.SearchSourceRestriction;
import org.nzbhydra.config.SearchingConfig;
import org.nzbhydra.config.category.Category;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.indexers.IndexerAccessResult;
import org.nzbhydra.indexers.IndexerApiAccessRepository;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.indexers.IndexerRepository;
import org.nzbhydra.indexers.IndexerSearchRepository;
import org.nzbhydra.indexers.IndexerWebAccess;
import org.nzbhydra.indexers.QueryGenerator;
import org.nzbhydra.mapping.newznab.xml.JaxbPubdateAdapter;
import org.nzbhydra.mapping.newznab.xml.NewznabAttribute;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlEnclosure;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlGuid;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.mediainfo.MediaIdType;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem.DownloadType;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchSource;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.when;

@SuppressWarnings("ALL")
public class TorznabTest {

    private BaseConfig baseConfig;
    @Mock
    private InfoProvider infoProviderMock;
    @Mock
    private IndexerWebAccess indexerWebAccessMock;
    @Mock
    private IndexerEntity indexerEntityMock;
    @Mock
    private CategoryProvider categoryProviderMock;
    @Mock
    private IndexerSearchRepository indexerSearchRepositoryMock;
    @Mock
    private IndexerRepository indexerRepositoryMock;
    @Mock
    private IndexerApiAccessRepository indexerApiAccessRepositoryMock;
    @Mock
    private UriComponentsBuilder uriComponentsBuilderMock;
    @Captor
    private ArgumentCaptor<String> errorMessageCaptor;
    @Captor
    private ArgumentCaptor<Boolean> disabledPermanentlyCaptor;
    @Captor
    private ArgumentCaptor<? extends IndexerAccessResult> indexerApiAccessResultCaptor;
    @Mock
    private ConfigProvider configProviderMock;
    @Mock
    private SearchingConfig searchingConfigMock;
    @Mock
    private Category categoryMock;
    @Mock
    private QueryGenerator queryGeneratorMock;

    @InjectMocks
    private Torznab testee = new Torznab(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);


    @BeforeEach
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        testee = spy(testee);
        final IndexerConfig config = new IndexerConfig();
        testee.initialize(config, indexerEntityMock);
        config.setSupportedSearchIds(Lists.newArrayList(MediaIdType.TMDB, MediaIdType.TVRAGE));
        config.setHost("http://127.0.0.1:1234");

        baseConfig = new BaseConfig();
        when(configProviderMock.getBaseConfig()).thenReturn(baseConfig);
        baseConfig.getSearching().setGenerateQueries(SearchSourceRestriction.NONE);
        baseConfig.getSearching().setRemoveTrailing(Collections.emptyList());
        when(categoryProviderMock.getNotAvailable()).thenReturn(CategoryProvider.naCategory);

        when(queryGeneratorMock.generateQueryIfApplicable(any(), any(), any())).thenAnswer(new Answer<String>() {
            @Override
            public String answer(InvocationOnMock invocation) throws Throwable {

                final SearchRequest searchRequest = (SearchRequest) invocation.getArgument(0);
                if (searchRequest.getQuery().isPresent()) {
                    return searchRequest.getQuery().get();
                }
                return invocation.getArgument(1);
            }
        });
    }


    @Test
    void shouldCreateSearchResultItem() throws Exception {
        NewznabXmlItem rssItem = buildBasicRssItem();
        rssItem.setSize(456L);
        rssItem.getTorznabAttributes().add(new NewznabAttribute("password", "0"));
        rssItem.getTorznabAttributes().add(new NewznabAttribute("group", "group"));
        rssItem.getTorznabAttributes().add(new NewznabAttribute("poster", "poster"));
        rssItem.getTorznabAttributes().add(new NewznabAttribute("size", "456"));
        rssItem.getTorznabAttributes().add(new NewznabAttribute("files", "10"));
        rssItem.getTorznabAttributes().add(new NewznabAttribute("grabs", "20"));
        rssItem.getTorznabAttributes().add(new NewznabAttribute("comments", "30"));
        rssItem.getTorznabAttributes().add(new NewznabAttribute("usenetdate", new JaxbPubdateAdapter().marshal(Instant.ofEpochSecond(6666666))));
        rssItem.getEnclosures().add(new NewznabXmlEnclosure("http://indexer.com/abc", 1L, "application/x-bittorrent"));
        rssItem.setCategory("4000");

        SearchResultItem item = testee.createSearchResultItem(rssItem);
        assertThat(item.getLink()).isEqualTo("http://indexer.com/abc");
        assertThat(item.getIndexerGuid()).isEqualTo("http://indexer.com/123RssGuid");
        assertThat(item.getSize()).isEqualTo(456L);
        assertThat(item.getCommentsLink()).isEqualTo("http://indexer.com/123/details#comments");
        assertThat(item.getDetails()).isEqualTo("http://indexer.com/123/details#comments");
        assertThat(item.isAgePrecise()).isEqualTo(true);
        assertThat(item.getGrabs()).isEqualTo(20);
        assertThat(item.getDownloadType()).isEqualTo(DownloadType.TORRENT);
    }


    @Test
    void shouldComputeCategory() throws Exception {
        when(categoryProviderMock.fromResultNewznabCategories(ArgumentMatchers.any())).thenReturn(categoryMock);
        NewznabXmlItem rssItem = buildBasicRssItem();
        rssItem.getTorznabAttributes().add(new NewznabAttribute("category", "5070"));
        rssItem.getEnclosures().add(new NewznabXmlEnclosure("url", 1L, "application/x-bittorrent"));

        SearchResultItem item = testee.createSearchResultItem(rssItem);
        assertThat(item.getCategory()).isEqualTo(categoryMock);

        rssItem.getTorznabAttributes().clear();
        rssItem.setCategory("5070");
        item = testee.createSearchResultItem(rssItem);
        assertThat(item.getCategory()).isEqualTo(categoryMock);
    }

    private NewznabXmlItem buildBasicRssItem() {
        NewznabXmlItem rssItem = new NewznabXmlItem();
        rssItem.setLink("http://indexer.com/123Guid");
        rssItem.setRssGuid(new NewznabXmlGuid("http://indexer.com/123RssGuid", false));
        rssItem.setTitle("title");
        rssItem.setEnclosure(new NewznabXmlEnclosure("http://indexer.com/123456", 456L, "application/x-nzb"));
        rssItem.setPubDate(Instant.ofEpochSecond(5555555));
        rssItem.setDescription("description");
        rssItem.setComments("http://indexer.com/123/details#comments");
        rssItem.setTorznabAttributes(new ArrayList<>());
        return rssItem;
    }

    @Test
    void shouldNotAddExcludedWordsToQuery() throws Exception {
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.getInternalData().setForbiddenWords(Arrays.asList("notthis", "alsonotthis"));
        searchRequest.setQuery("query");
        UriComponentsBuilder builder = testee.buildSearchUrl(searchRequest, 0, 100);
        assertThat(builder.toUriString()).doesNotContain("notthis");
    }

    @Test
    void shouldGetCorrectCategoryNumber() {
        NewznabXmlItem item = buildBasicRssItem();

        item.setTorznabAttributes(Collections.singletonList(new NewznabAttribute("category", "2000")));
        List<Integer> integers = testee.tryAndGetCategoryAsNumber(item);
        assertThat(integers.size()).isEqualTo(1);
        assertThat(integers.get(0)).isEqualTo(2000);

        item.setTorznabAttributes(Collections.singletonList(new NewznabAttribute("category", "10000")));
        integers = testee.tryAndGetCategoryAsNumber(item);
        assertThat(integers.size()).isEqualTo(1);
        assertThat(integers.get(0)).isEqualTo(10000);

        item.setTorznabAttributes(Arrays.asList(new NewznabAttribute("category", "2000"), new NewznabAttribute("category", "10000")));
        integers = testee.tryAndGetCategoryAsNumber(item);
        integers.sort(Comparator.naturalOrder());
        assertThat(integers.size()).isEqualTo(2);
        assertThat(integers.get(0)).isEqualTo(2000);
        assertThat(integers.get(1)).isEqualTo(10000);

        item.setTorznabAttributes(Arrays.asList(new NewznabAttribute("category", "2000"), new NewznabAttribute("category", "2040")));
        integers = testee.tryAndGetCategoryAsNumber(item);
        integers.sort(Comparator.naturalOrder());
        assertThat(integers.size()).isEqualTo(2);
        assertThat(integers.get(0)).isEqualTo(2000);
        assertThat(integers.get(1)).isEqualTo(2040);

        item.setTorznabAttributes(Arrays.asList(new NewznabAttribute("category", "2000"), new NewznabAttribute("category", "2040"), new NewznabAttribute("category", "10000")));
        integers = testee.tryAndGetCategoryAsNumber(item);
        integers.sort(Comparator.naturalOrder());
        assertThat(integers.size()).isEqualTo(3);
        assertThat(integers.get(0)).isEqualTo(2000);
        assertThat(integers.get(1)).isEqualTo(2040);
    }


}
