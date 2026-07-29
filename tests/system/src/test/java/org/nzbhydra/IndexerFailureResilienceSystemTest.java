package org.nzbhydra;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.historystats.SortModel;
import org.nzbhydra.historystats.stats.HistoryRequest;
import org.nzbhydra.hydraconfigure.ConfigManager;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.nzbhydra.searching.db.SearchEntityTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ContextConfiguration;
import tools.jackson.core.type.TypeReference;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

@SpringBootTest
@ContextConfiguration(classes = {TestConfig.class})
public class IndexerFailureResilienceSystemTest {

    private static final String FAILED_INDEXER = "Mock1";
    private static final String FAILED_INDEXER_API_KEY = "resilience-failure-indexer";
    private static final String BASELINE_FAILED_INDEXER_API_KEY = "1";
    private static final String TIMEOUT_QUERY = "resilience-timeout-results";
    private static final String MALFORMED_XML_RESULTS_QUERY = "resilience-malformed-xml-results";
    private static final String MALFORMED_XML_HISTORY_QUERY = "resilience-malformed-xml-history";

    @Autowired
    private HydraClient hydraClient;

    @Autowired
    private ConfigManager configManager;

    private BaseConfig originalConfig;

    @BeforeEach
    public void setUp() {
        originalConfig = configManager.getCurrentConfig();
        configureFailedIndexer(1);
    }

    @AfterEach
    public void restoreConfiguration() {
        getFailedIndexer(originalConfig).setApiKey(BASELINE_FAILED_INDEXER_API_KEY);
        configManager.setConfig(originalConfig);
    }

    @Test
    public void shouldReturnPartialResultsWhenOneIndexerTimesOut() {
        HydraResponse response = hydraClient.get("/api", "apikey=apikey", "t=search", "q=" + TIMEOUT_QUERY);

        assertThat(response.status()).isEqualTo(200);
        assertHealthyResultsOnly(Jackson.getUnmarshal(response.body()));
    }

    @Test
    public void shouldReturnPartialResultsWhenOneIndexerReturnsMalformedXml() {
        HydraResponse response = hydraClient.get("/api", "apikey=apikey", "t=search", "q=" + MALFORMED_XML_RESULTS_QUERY);

        assertThat(response.status()).isEqualTo(200);
        assertHealthyResultsOnly(Jackson.getUnmarshal(response.body()));
    }

    @Test
    public void shouldRecordIndexerFailureInSearchHistory() {
        hydraClient.get("/api", "apikey=apikey", "t=search", "q=" + MALFORMED_XML_HISTORY_QUERY).body();

        await().atMost(Duration.ofSeconds(5)).untilAsserted(() -> {
            SearchHistoryDetails details = getSearchDetails(MALFORMED_XML_HISTORY_QUERY);
            assertThat(details.getIndexerSearches()).anySatisfy(indexerSearch -> {
                assertThat(indexerSearch.getIndexerName()).isEqualTo(FAILED_INDEXER);
                assertThat(indexerSearch.isSuccessful()).isFalse();
                assertThat(indexerSearch.getResultsCount()).isZero();
                assertThat(indexerSearch.getErrorMessage()).isNotBlank();
            });
        });
    }

    @Test
    public void shouldUpdateIndexerStatusAfterRepeatedFailures() {
        for (int expectedLevel = 1; expectedLevel <= 3; expectedLevel++) {
            prepareFailedIndexerForFailure(expectedLevel - 1);
            hydraClient.get("/api", "apikey=apikey", "t=search", "q=resilience-timeout-status-" + expectedLevel).body();

            int level = expectedLevel;
            await().atMost(Duration.ofSeconds(5)).untilAsserted(() -> {
                IndexerStatus status = getFailedIndexerStatus();
                assertThat(status.getState()).isEqualTo(IndexerConfig.State.DISABLED_SYSTEM_TEMPORARY.name());
                assertThat(status.getLevel()).isEqualTo(level);
                assertThat(status.getDisabledUntil()).isAfter(Instant.now());
                assertThat(status.getLastError()).isNotBlank();
            });

        }
    }

    private void assertHealthyResultsOnly(NewznabXmlRoot root) {
        List<NewznabXmlItem> items = root.getRssChannel().getItems();
        assertThat(items).isNotEmpty();
        assertThat(items).allSatisfy(item -> assertThat(item.getNewznabAttributes()).noneMatch(attribute ->
                "hydraIndexerName".equals(attribute.getName()) && FAILED_INDEXER.equals(attribute.getValue())));
        assertThat(items).anySatisfy(item -> containsIndexer(item, "Mock2"));
        assertThat(items).anySatisfy(item -> containsIndexer(item, "Mock3"));
    }

    private boolean containsIndexer(NewznabXmlItem item, String indexerName) {
        return item.getNewznabAttributes().stream().anyMatch(attribute ->
                "hydraIndexerName".equals(attribute.getName()) && indexerName.equals(attribute.getValue()));
    }

    private SearchHistoryDetails getSearchDetails(String query) {
        HistoryRequest historyRequest = new HistoryRequest();
        historyRequest.setSortModel(new SortModel("time", 0));
        HydraPage<SearchEntityTO> page = hydraClient.post("/internalapi/history/searches", historyRequest).as(new TypeReference<>() {
        });
        SearchEntityTO search = page.getContent().stream()
                .filter(entry -> query.equals(entry.getQuery()))
                .findFirst()
                .orElseThrow();
        return hydraClient.get("/internalapi/history/searches/details/" + search.getId()).as(SearchHistoryDetails.class);
    }

    private IndexerStatus getFailedIndexerStatus() {
        List<IndexerStatus> statuses = hydraClient.get("/internalapi/indexerstatuses").as(new TypeReference<>() {
        });
        return statuses.stream()
                .filter(status -> FAILED_INDEXER.equals(status.getIndexer()))
                .findFirst()
                .orElseThrow();
    }

    private void prepareFailedIndexerForFailure(int previousFailureLevel) {
        BaseConfig config = configManager.getCurrentConfig();
        IndexerConfig failedIndexer = getFailedIndexer(config);
        failedIndexer.setState(IndexerConfig.State.DISABLED_SYSTEM_TEMPORARY);
        failedIndexer.setDisabledUntil(Instant.now().minusSeconds(1).toEpochMilli());
        failedIndexer.setDisabledLevel(previousFailureLevel);
        configManager.setConfig(config);
    }

    private void configureFailedIndexer(int timeout) {
        BaseConfig config = configManager.getCurrentConfig();
        IndexerConfig failedIndexer = getFailedIndexer(config);
        failedIndexer.setApiKey(FAILED_INDEXER_API_KEY);
        failedIndexer.setTimeout(timeout);
        failedIndexer.setState(IndexerConfig.State.ENABLED);
        failedIndexer.setDisabledUntil(null);
        failedIndexer.setDisabledLevel(0);
        failedIndexer.setDisabledAt(null);
        failedIndexer.setLastError(null);
        configManager.setConfig(config);
    }

    private IndexerConfig getFailedIndexer(BaseConfig config) {
        return config.getIndexers().stream()
                .filter(indexer -> FAILED_INDEXER.equals(indexer.getName()))
                .findFirst()
                .orElseThrow();
    }

    public static class SearchHistoryDetails {
        private List<IndexerSearchDetails> indexerSearches;

        public List<IndexerSearchDetails> getIndexerSearches() {
            return indexerSearches;
        }

        public void setIndexerSearches(List<IndexerSearchDetails> indexerSearches) {
            this.indexerSearches = indexerSearches;
        }
    }

    @Setter
    @Getter
    @ToString
    public static class IndexerSearchDetails {
        private String indexerName;
        private boolean successful;
        private int resultsCount;
        private String errorMessage;

    }

    @Setter
    @Getter
    public static class IndexerStatus {
        private String indexer;
        private String state;
        private int level;
        private Instant disabledUntil;
        private String lastError;

    }
}
