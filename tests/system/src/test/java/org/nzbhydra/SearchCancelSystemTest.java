package org.nzbhydra;

import org.junit.jupiter.api.Test;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.hydraconfigure.ConfigManager;
import org.nzbhydra.searching.SearchResponse;
import org.nzbhydra.searching.dtoseventsenums.SearchRequestParameters;
import org.springframework.beans.factory.annotation.Autowired;
import tools.jackson.core.type.TypeReference;

import java.time.Duration;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Cancelling a search from the UI while one indexer hangs ends the search promptly with the other indexers' results
 * and does not count against the hanging indexer.
 */
@SystemTest
public class SearchCancelSystemTest {

    private static final String HANGING_INDEXER = "Mock1";
    // The mock server lets "sleeplong1" hang (practically forever) for the indexer with this API key only
    private static final String HANGING_INDEXER_API_KEY = "1";
    private static final String HANGING_QUERY = "sleeplong1";
    private static final int HANGING_INDEXER_TIMEOUT_SECONDS = 60;

    @Autowired
    private HydraClient hydraClient;

    @Autowired
    private ConfigManager configManager;

    @Test
    public void shouldEndSearchPromptlyWhenCancelledWhileAnIndexerHangs() throws Exception {
        // BaselineExtension restores the indexers before the next test
        BaseConfig config = configManager.getCurrentConfig();
        IndexerConfig hangingIndexer = config.getIndexers().stream()
                .filter(indexer -> HANGING_INDEXER.equals(indexer.getName()))
                .findFirst()
                .orElseThrow();
        hangingIndexer.setApiKey(HANGING_INDEXER_API_KEY);
        // Long enough that only the cancel can end the search within the time asserted below
        hangingIndexer.setTimeout(HANGING_INDEXER_TIMEOUT_SECONDS);
        configManager.setConfig(config);

        long searchRequestId = System.currentTimeMillis();
        SearchRequestParameters parameters = new SearchRequestParameters();
        parameters.setQuery(HANGING_QUERY);
        parameters.setSearchRequestId(searchRequestId);

        long start = System.nanoTime();
        CompletableFuture<SearchResponse> search = CompletableFuture.supplyAsync(() ->
                hydraClient.post("/internalapi/search", parameters).as(SearchResponse.class));
        // Give the other indexers time to answer and the hanging one time to start hanging. The mock server's
        // "failure-sleep" scenario delays every "sleep*" query by up to five seconds, so wait longer than that.
        Thread.sleep(6500);
        assertThat(search).isNotDone();

        HydraResponse abortResponse = hydraClient.post("/internalapi/abortSearch/" + searchRequestId, null, "reason=cancelled");
        assertThat(abortResponse.status()).isEqualTo(200);

        SearchResponse response = search.get(15, TimeUnit.SECONDS);
        assertThat(Duration.ofNanos(System.nanoTime() - start)).isLessThan(Duration.ofSeconds(HANGING_INDEXER_TIMEOUT_SECONDS / 2));
        assertThat(response.getSearchResults()).isNotEmpty();
        assertThat(response.getSearchResults()).noneMatch(result -> HANGING_INDEXER.equals(result.getIndexer()));

        List<IndexerFailureResilienceSystemTest.IndexerStatus> statuses = hydraClient.get("/internalapi/indexerstatuses").as(new TypeReference<>() {
        });
        IndexerFailureResilienceSystemTest.IndexerStatus status = statuses.stream()
                .filter(x -> HANGING_INDEXER.equals(x.getIndexer()))
                .findFirst()
                .orElseThrow();
        assertThat(status.getState()).isEqualTo(IndexerConfig.State.ENABLED.name());
        assertThat(status.getLevel()).isZero();
    }
}
