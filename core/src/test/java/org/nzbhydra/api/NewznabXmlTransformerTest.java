/*
 *  (C) Copyright 2017 TheOtherP (theotherp@gmx.de)
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

package org.nzbhydra.api;

import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.config.*;
import org.nzbhydra.downloading.FileHandler;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.searching.SearchResult;
import org.nzbhydra.searching.dtoseventsenums.DownloadType;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.dtoseventsenums.SearchType;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

public class NewznabXmlTransformerTest {

    @Mock
    protected FileHandler nzbHandler;
    @Mock
    protected ConfigProvider configProvider;
    @Mock
    private SearchResult searchResult;

    @Mock
    private Indexer indexerMock;
    BaseConfig baseConfig = new BaseConfig();
    IndexerConfig indexerConfig = new IndexerConfig();


    @Before
    public void setUp() {
        MockitoAnnotations.initMocks(this);
        when(configProvider.getBaseConfig()).thenReturn(baseConfig);
        baseConfig.setMain(new MainConfig());
        baseConfig.getMain().setApiKey("apikey");

        when(searchResult.getNumberOfAcceptedResults()).thenReturn(10);
        when(searchResult.getNumberOfProcessedResults()).thenReturn(10);
        when(searchResult.getNumberOfRejectedResults()).thenReturn(0);
        when(searchResult.getNumberOfRemovedDuplicates()).thenReturn(0);
        when(searchResult.getNumberOfTotalAvailableResults()).thenReturn(10);

        when(indexerMock.getConfig()).thenReturn(indexerConfig);
        indexerConfig.setHost("http://127.0.0.1");
    }

    @InjectMocks
    private NewznabXmlTransformer testee = new NewznabXmlTransformer();


    @Test
    public void shouldUseCorrectApplicationType() {
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        SearchResultItem searchResultItem = new SearchResultItem();
        searchResultItem.setIndexer(indexerMock);
        searchResultItem.setCategory(new Category());

        searchRequest.setDownloadType(DownloadType.NZB);
        NewznabXmlItem item = testee.buildRssItem(searchResultItem, searchRequest);
        assertThat(item.getEnclosure().getType()).isEqualTo("application/x-nzb");

        searchRequest.setDownloadType(DownloadType.TORRENT);
        item = testee.buildRssItem(searchResultItem, searchRequest);
        assertThat(item.getEnclosure().getType()).isEqualTo("application/x-bittorrent");

    }

}