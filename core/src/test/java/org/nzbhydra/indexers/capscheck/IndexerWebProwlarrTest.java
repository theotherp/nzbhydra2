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

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.indexers.capscheck.IndexerWeb.ProwlarrConfigReadRequest;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@MockitoSettings(strictness = Strictness.LENIENT)
public class IndexerWebProwlarrTest {

    @Mock
    private IndexerChecker indexerChecker;
    @Mock
    private SimpleConnectionChecker simpleConnectionChecker;
    @Mock
    private JacketConfigRetriever jacketConfigRetriever;
    @Mock
    private ProwlarrConfigRetriever prowlarrConfigRetriever;

    @InjectMocks
    private IndexerWeb testee = new IndexerWeb();

    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    public void setUp() {
    }

    @Test
    void shouldAddNewProwlarrIndexers() throws Exception {
        List<IndexerConfig> existingIndexers = new ArrayList<>();
        IndexerConfig prowlarrConfig = createProwlarrConfig();

        IndexerConfig newIndexer = createIndexerConfig("NZBgeek (Prowlarr)", SearchModuleType.NEWZNAB, "http://prowlarr:9696/1");
        when(prowlarrConfigRetriever.retrieveIndexers(any())).thenReturn(Arrays.asList(newIndexer));

        ResponseEntity<?> response = testee.readProwlarrConfig(createRequest(existingIndexers, prowlarrConfig));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<String, Object> body = objectMapper.convertValue(response.getBody(), Map.class);
        assertThat((Integer) body.get("addedIndexers")).isEqualTo(1);
        assertThat((Integer) body.get("updatedIndexers")).isEqualTo(0);
        assertThat((Integer) body.get("removedIndexers")).isEqualTo(0);
        assertThat(((List<?>) body.get("newIndexersConfig"))).hasSize(1);
    }

    @Test
    void shouldUpdateExistingProwlarrIndexers() throws Exception {
        IndexerConfig existingProwlarrIndexer = createIndexerConfig("NZBgeek (Prowlarr)", SearchModuleType.NEWZNAB, "http://old-prowlarr:9696/1");
        List<IndexerConfig> existingIndexers = new ArrayList<>(Arrays.asList(existingProwlarrIndexer));
        IndexerConfig prowlarrConfig = createProwlarrConfig();

        IndexerConfig updatedIndexer = createIndexerConfig("NZBgeek (Prowlarr)", SearchModuleType.NEWZNAB, "http://new-prowlarr:9696/1");
        when(prowlarrConfigRetriever.retrieveIndexers(any())).thenReturn(Arrays.asList(updatedIndexer));

        ResponseEntity<?> response = testee.readProwlarrConfig(createRequest(existingIndexers, prowlarrConfig));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<String, Object> body = objectMapper.convertValue(response.getBody(), Map.class);
        assertThat((Integer) body.get("addedIndexers")).isEqualTo(0);
        assertThat((Integer) body.get("updatedIndexers")).isEqualTo(1);
        assertThat((Integer) body.get("removedIndexers")).isEqualTo(0);
    }

    @Test
    void shouldRemoveProwlarrIndexersNotInNewConfig() throws Exception {
        IndexerConfig existingProwlarrIndexer = createIndexerConfig("OldIndexer (Prowlarr)", SearchModuleType.NEWZNAB, "http://prowlarr:9696/1");
        IndexerConfig existingNonProwlarrIndexer = createIndexerConfig("RegularIndexer", SearchModuleType.NEWZNAB, "http://indexer.com");
        List<IndexerConfig> existingIndexers = new ArrayList<>(Arrays.asList(existingProwlarrIndexer, existingNonProwlarrIndexer));
        IndexerConfig prowlarrConfig = createProwlarrConfig();

        IndexerConfig newIndexer = createIndexerConfig("NewIndexer (Prowlarr)", SearchModuleType.NEWZNAB, "http://prowlarr:9696/2");
        when(prowlarrConfigRetriever.retrieveIndexers(any())).thenReturn(Arrays.asList(newIndexer));

        ResponseEntity<?> response = testee.readProwlarrConfig(createRequest(existingIndexers, prowlarrConfig));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<String, Object> body = objectMapper.convertValue(response.getBody(), Map.class);
        assertThat((Integer) body.get("addedIndexers")).isEqualTo(1);
        assertThat((Integer) body.get("removedIndexers")).isEqualTo(1);
        List<Map<String, Object>> newConfigs = (List<Map<String, Object>>) body.get("newIndexersConfig");
        assertThat(newConfigs).hasSize(2);
        assertThat(newConfigs.stream().map(c -> c.get("name")).toList())
                .containsExactlyInAnyOrder("RegularIndexer", "NewIndexer (Prowlarr)");
    }

    @Test
    void shouldKeepNonProwlarrIndexersIntact() throws Exception {
        IndexerConfig existingNonProwlarrIndexer = createIndexerConfig("RegularIndexer", SearchModuleType.NEWZNAB, "http://indexer.com");
        List<IndexerConfig> existingIndexers = new ArrayList<>(Arrays.asList(existingNonProwlarrIndexer));
        IndexerConfig prowlarrConfig = createProwlarrConfig();

        when(prowlarrConfigRetriever.retrieveIndexers(any())).thenReturn(new ArrayList<>());

        ResponseEntity<?> response = testee.readProwlarrConfig(createRequest(existingIndexers, prowlarrConfig));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<String, Object> body = objectMapper.convertValue(response.getBody(), Map.class);
        List<Map<String, Object>> newConfigs = (List<Map<String, Object>>) body.get("newIndexersConfig");
        assertThat(newConfigs).hasSize(1);
        assertThat(newConfigs.get(0).get("name")).isEqualTo("RegularIndexer");
    }

    @Test
    void shouldReturnBadRequestOnIndexerAccessException() throws Exception {
        List<IndexerConfig> existingIndexers = new ArrayList<>();
        IndexerConfig prowlarrConfig = createProwlarrConfig();

        when(prowlarrConfigRetriever.retrieveIndexers(any()))
                .thenThrow(new IndexerAccessException("Error accessing Prowlarr: Unauthorized. Code: 401"));

        ResponseEntity<?> response = testee.readProwlarrConfig(createRequest(existingIndexers, prowlarrConfig));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        IndexerWeb.ProwlarrConfigReadResponse body = (IndexerWeb.ProwlarrConfigReadResponse) response.getBody();
        assertThat(body.getErrorMessage()).contains("Error accessing Prowlarr");
        assertThat(body.getErrorMessage()).contains("Unauthorized");
    }

    @Test
    void shouldReturnBadRequestOnUnexpectedException() throws Exception {
        List<IndexerConfig> existingIndexers = new ArrayList<>();
        IndexerConfig prowlarrConfig = createProwlarrConfig();

        when(prowlarrConfigRetriever.retrieveIndexers(any()))
                .thenThrow(new RuntimeException("Unexpected error"));

        ResponseEntity<?> response = testee.readProwlarrConfig(createRequest(existingIndexers, prowlarrConfig));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        IndexerWeb.ProwlarrConfigReadResponse body = (IndexerWeb.ProwlarrConfigReadResponse) response.getBody();
        assertThat(body.getErrorMessage()).contains("Error reading Prowlarr config");
        assertThat(body.getErrorMessage()).contains("Unexpected error");
    }

    private IndexerConfig createProwlarrConfig() {
        IndexerConfig config = new IndexerConfig();
        config.setHost("http://127.0.0.1:9696");
        config.setApiKey("testapikey");
        return config;
    }

    private IndexerConfig createIndexerConfig(String name, SearchModuleType type, String host) {
        IndexerConfig config = new IndexerConfig();
        config.setName(name);
        config.setSearchModuleType(type);
        config.setHost(host);
        config.setApiKey("apikey");
        return config;
    }

    private ProwlarrConfigReadRequest createRequest(List<IndexerConfig> existingIndexers, IndexerConfig prowlarrConfig) {
        ProwlarrConfigReadRequest request = new ProwlarrConfigReadRequest();
        request.setExistingIndexers(existingIndexers);
        request.setProwlarrConfig(prowlarrConfig);
        return request;
    }
}
