/*
 *  (C) Copyright 2024 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.indexers.capscheck;

import com.fasterxml.jackson.core.type.TypeReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.indexers.capscheck.ProwlarrConfigRetriever.ProwlarrIndexer;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.webaccess.WebAccess;
import org.nzbhydra.webaccess.WebAccessException;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@MockitoSettings(strictness = Strictness.LENIENT)
public class ProwlarrConfigRetrieverTest {

    @Mock
    private WebAccess webAccessMock;

    @InjectMocks
    private ProwlarrConfigRetriever testee = new ProwlarrConfigRetriever();

    private IndexerConfig prowlarrConfig;

    @BeforeEach
    public void setUp() {
        prowlarrConfig = new IndexerConfig();
        prowlarrConfig.setHost("http://127.0.0.1:9696");
        prowlarrConfig.setApiKey("testapikey");
    }

    @Test
    void shouldRetrieveUsenetIndexerAsNewznab() throws Exception {
        ProwlarrIndexer usenetIndexer = createProwlarrIndexer(1, "NZBgeek", "usenet", true);
        when(webAccessMock.callUrl(eq("http://127.0.0.1:9696/api/v1/indexer?apikey=testapikey"), any(TypeReference.class)))
                .thenReturn(Collections.singletonList(usenetIndexer));

        List<IndexerConfig> configs = testee.retrieveIndexers(prowlarrConfig);

        assertThat(configs).hasSize(1);
        assertThat(configs.get(0).getName()).isEqualTo("NZBgeek (Prowlarr)");
        assertThat(configs.get(0).getSearchModuleType()).isEqualTo(SearchModuleType.NEWZNAB);
        assertThat(configs.get(0).getHost()).isEqualTo("http://127.0.0.1:9696/1");
        assertThat(configs.get(0).getApiKey()).isEqualTo("testapikey");
        assertThat(configs.get(0).isConfigComplete()).isTrue();
        assertThat(configs.get(0).isAllCapsChecked()).isTrue();
    }

    @Test
    void shouldRetrieveTorrentIndexerAsTorznab() throws Exception {
        ProwlarrIndexer torrentIndexer = createProwlarrIndexer(2, "1337x", "torrent", true);
        when(webAccessMock.callUrl(eq("http://127.0.0.1:9696/api/v1/indexer?apikey=testapikey"), any(TypeReference.class)))
                .thenReturn(Collections.singletonList(torrentIndexer));

        List<IndexerConfig> configs = testee.retrieveIndexers(prowlarrConfig);

        assertThat(configs).hasSize(1);
        assertThat(configs.get(0).getName()).isEqualTo("1337x (Prowlarr)");
        assertThat(configs.get(0).getSearchModuleType()).isEqualTo(SearchModuleType.TORZNAB);
        assertThat(configs.get(0).getHost()).isEqualTo("http://127.0.0.1:9696/2");
    }

    @Test
    void shouldSkipDisabledIndexers() throws Exception {
        ProwlarrIndexer disabledIndexer = createProwlarrIndexer(1, "DisabledIndexer", "usenet", false);
        ProwlarrIndexer enabledIndexer = createProwlarrIndexer(2, "EnabledIndexer", "usenet", true);
        when(webAccessMock.callUrl(any(), any(TypeReference.class)))
                .thenReturn(Arrays.asList(disabledIndexer, enabledIndexer));

        List<IndexerConfig> configs = testee.retrieveIndexers(prowlarrConfig);

        assertThat(configs).hasSize(1);
        assertThat(configs.get(0).getName()).isEqualTo("EnabledIndexer (Prowlarr)");
    }

    @Test
    void shouldSkipIndexersWithUnsupportedProtocol() throws Exception {
        ProwlarrIndexer unsupportedIndexer = createProwlarrIndexer(1, "UnsupportedIndexer", "unknown", true);
        ProwlarrIndexer usenetIndexer = createProwlarrIndexer(2, "UsenetIndexer", "usenet", true);
        when(webAccessMock.callUrl(any(), any(TypeReference.class)))
                .thenReturn(Arrays.asList(unsupportedIndexer, usenetIndexer));

        List<IndexerConfig> configs = testee.retrieveIndexers(prowlarrConfig);

        assertThat(configs).hasSize(1);
        assertThat(configs.get(0).getName()).isEqualTo("UsenetIndexer (Prowlarr)");
    }

    @Test
    void shouldHandleMultipleIndexers() throws Exception {
        ProwlarrIndexer usenetIndexer = createProwlarrIndexer(1, "NZBgeek", "usenet", true);
        ProwlarrIndexer torrentIndexer = createProwlarrIndexer(2, "1337x", "torrent", true);
        when(webAccessMock.callUrl(any(), any(TypeReference.class)))
                .thenReturn(Arrays.asList(usenetIndexer, torrentIndexer));

        List<IndexerConfig> configs = testee.retrieveIndexers(prowlarrConfig);

        assertThat(configs).hasSize(2);
        assertThat(configs.get(0).getSearchModuleType()).isEqualTo(SearchModuleType.NEWZNAB);
        assertThat(configs.get(1).getSearchModuleType()).isEqualTo(SearchModuleType.TORZNAB);
    }

    @Test
    void shouldRemoveTrailingSlashFromHost() throws Exception {
        prowlarrConfig.setHost("http://127.0.0.1:9696/");
        ProwlarrIndexer indexer = createProwlarrIndexer(1, "TestIndexer", "usenet", true);
        when(webAccessMock.callUrl(eq("http://127.0.0.1:9696/api/v1/indexer?apikey=testapikey"), any(TypeReference.class)))
                .thenReturn(Collections.singletonList(indexer));

        List<IndexerConfig> configs = testee.retrieveIndexers(prowlarrConfig);

        assertThat(configs).hasSize(1);
        assertThat(configs.get(0).getHost()).isEqualTo("http://127.0.0.1:9696/1");
    }

    @Test
    void shouldThrowIndexerAccessExceptionOnWebAccessError() throws Exception {
        when(webAccessMock.callUrl(any(), any(TypeReference.class)))
                .thenThrow(new WebAccessException("Unauthorized", "", 401));

        assertThatThrownBy(() -> testee.retrieveIndexers(prowlarrConfig))
                .isInstanceOf(IndexerAccessException.class)
                .hasMessageContaining("Error accessing Prowlarr")
                .hasMessageContaining("Unauthorized");
    }

    @Test
    void shouldReturnEmptyListWhenNoIndexersFound() throws Exception {
        when(webAccessMock.callUrl(any(), any(TypeReference.class)))
                .thenReturn(Collections.emptyList());

        List<IndexerConfig> configs = testee.retrieveIndexers(prowlarrConfig);

        assertThat(configs).isEmpty();
    }

    private ProwlarrIndexer createProwlarrIndexer(int id, String name, String protocol, boolean enable) {
        ProwlarrIndexer indexer = new ProwlarrIndexer();
        indexer.setId(id);
        indexer.setName(name);
        indexer.setProtocol(protocol);
        indexer.setEnable(enable);
        return indexer;
    }
}
