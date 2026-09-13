

package org.nzbhydra.indexers.capscheck;

import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.indexers.capscheck.IndexerWeb.ProwlarrConfigReadRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@MockitoSettings(strictness = Strictness.LENIENT)
public class IndexerWebProwlarrIdTrackingTest {

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

    private final ObjectMapper objectMapper = new JsonMapper();

    @Test
    void shouldNotRemoveIndexerFromDifferentProwlarrInstance() throws Exception {
        // Indexer from a different Prowlarr instance should not be touched
        IndexerConfig otherProwlarrIndexer = createIndexerConfig("Indexer (Prowlarr)", SearchModuleType.NEWZNAB, "http://other-prowlarr:9696/1");
        List<IndexerConfig> existingIndexers = new ArrayList<>(Arrays.asList(otherProwlarrIndexer));
        IndexerConfig prowlarrConfig = createProwlarrConfig();

        when(prowlarrConfigRetriever.retrieveIndexers(any())).thenReturn(new ArrayList<>());

        ResponseEntity<?> response = testee.readProwlarrConfig(createRequest(existingIndexers, prowlarrConfig));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<String, Object> body = objectMapper.convertValue(response.getBody(), Map.class);
        assertThat((Integer) body.get("removedIndexers")).isEqualTo(0);
        List<Map<String, Object>> newConfigs = (List<Map<String, Object>>) body.get("newIndexersConfig");
        assertThat(newConfigs).hasSize(1);
        assertThat(newConfigs.get(0).get("name")).isEqualTo("Indexer (Prowlarr)");
    }

    @Test
    void shouldHandleMultipleRenamedIndexersWithMixedOutcomes() throws Exception {
        // Two renamed Prowlarr indexers: one still in Prowlarr (update), one removed
        IndexerConfig renamedKept = createIndexerConfig("Kept Indexer", SearchModuleType.NEWZNAB, "http://127.0.0.1:9696/1");
        IndexerConfig renamedRemoved = createIndexerConfig("Removed Indexer", SearchModuleType.TORZNAB, "http://127.0.0.1:9696/2");
        IndexerConfig regularIndexer = createIndexerConfig("Regular", SearchModuleType.NEWZNAB, "http://indexer.com");
        List<IndexerConfig> existingIndexers = new ArrayList<>(Arrays.asList(renamedKept, renamedRemoved, regularIndexer));
        IndexerConfig prowlarrConfig = createProwlarrConfig();

        // Prowlarr now only has indexer with ID 1 and a new one with ID 3
        IndexerConfig found1 = createIndexerConfig("NZBgeek (Prowlarr)", SearchModuleType.NEWZNAB, "http://127.0.0.1:9696/1");
        IndexerConfig found3 = createIndexerConfig("NewOne (Prowlarr)", SearchModuleType.TORZNAB, "http://127.0.0.1:9696/3");
        when(prowlarrConfigRetriever.retrieveIndexers(any())).thenReturn(Arrays.asList(found1, found3));

        ResponseEntity<?> response = testee.readProwlarrConfig(createRequest(existingIndexers, prowlarrConfig));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<String, Object> body = objectMapper.convertValue(response.getBody(), Map.class);
        assertThat((Integer) body.get("updatedIndexers")).isEqualTo(1);
        assertThat((Integer) body.get("addedIndexers")).isEqualTo(1);
        assertThat((Integer) body.get("removedIndexers")).isEqualTo(1);
        List<Map<String, Object>> newConfigs = (List<Map<String, Object>>) body.get("newIndexersConfig");
        assertThat(newConfigs).hasSize(3);
        assertThat(newConfigs.stream().map(c -> c.get("name")).toList())
                .containsExactlyInAnyOrder("Kept Indexer", "Regular", "NewOne (Prowlarr)");
    }

    @Test
    void shouldHandleProwlarrHostWithTrailingSlash() throws Exception {
        IndexerConfig existingProwlarrIndexer = createIndexerConfig("Indexer (Prowlarr)", SearchModuleType.NEWZNAB, "http://127.0.0.1:9696/1");
        List<IndexerConfig> existingIndexers = new ArrayList<>(Arrays.asList(existingProwlarrIndexer));
        IndexerConfig prowlarrConfig = createProwlarrConfig();
        prowlarrConfig.setHost("http://127.0.0.1:9696/");

        when(prowlarrConfigRetriever.retrieveIndexers(any())).thenReturn(new ArrayList<>());

        ResponseEntity<?> response = testee.readProwlarrConfig(createRequest(existingIndexers, prowlarrConfig));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<String, Object> body = objectMapper.convertValue(response.getBody(), Map.class);
        assertThat((Integer) body.get("removedIndexers")).isEqualTo(1);
        List<?> newConfigs = (List<?>) body.get("newIndexersConfig");
        assertThat(newConfigs).isEmpty();
    }

    @Test
    void shouldUpdateHostAndApiKeyAndSearchModuleType() throws Exception {
        IndexerConfig existing = createIndexerConfig("My Indexer", SearchModuleType.NEWZNAB, "http://127.0.0.1:9696/5");
        existing.setApiKey("oldkey");
        List<IndexerConfig> existingIndexers = new ArrayList<>(Arrays.asList(existing));
        IndexerConfig prowlarrConfig = createProwlarrConfig();

        IndexerConfig found = createIndexerConfig("Changed (Prowlarr)", SearchModuleType.TORZNAB, "http://127.0.0.1:9696/5");
        found.setApiKey("newkey");
        when(prowlarrConfigRetriever.retrieveIndexers(any())).thenReturn(Arrays.asList(found));

        ResponseEntity<?> response = testee.readProwlarrConfig(createRequest(existingIndexers, prowlarrConfig));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<String, Object> body = objectMapper.convertValue(response.getBody(), Map.class);
        assertThat((Integer) body.get("updatedIndexers")).isEqualTo(1);
        List<Map<String, Object>> newConfigs = (List<Map<String, Object>>) body.get("newIndexersConfig");
        assertThat(newConfigs).hasSize(1);
        // Name preserved, but host/apiKey/type updated
        assertThat(newConfigs.get(0).get("name")).isEqualTo("My Indexer");
        assertThat(newConfigs.get(0).get("host")).isEqualTo("http://127.0.0.1:9696/5");
        assertThat(newConfigs.get(0).get("apiKey")).isEqualTo("newkey");
        assertThat(newConfigs.get(0).get("searchModuleType")).isEqualTo("TORZNAB");
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
