package org.nzbhydra;

import org.junit.jupiter.api.Test;
import org.nzbhydra.searching.SearchResponse;
import org.nzbhydra.searching.dtoseventsenums.SearchResultWebTO;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Duration;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

/**
 * Regression test for a bug where {@code InternalSearchResultProcessor} never marked already-downloaded results as
 * such: it looked already-downloaded results up by the externally visible search result hash, but
 * {@code FileDownloadRepository.findBySearchResultIdIn} resolved to {@code SearchResultEntity}'s internal sequential
 * primary key rather than its {@code hash} column, so the lookup never matched anything the migration introducing
 * that key split (60ebf1bd) had persisted.
 */
@SystemTest
public class InternalSearchDownloadStatusSystemTest {

    @Autowired
    private Searcher searcher;

    @Autowired
    private HydraClient hydraClient;

    @Test
    public void shouldMarkResultAsDownloadedAfterInternalDownload() throws Exception {
        String query = "internalDownloadStatusTest-" + UUID.randomUUID().toString().replace("-", "");

        SearchResponse before = searcher.searchInternal(query);
        assertThat(before.getSearchResults()).isNotEmpty();
        SearchResultWebTO result = before.getSearchResults().get(0);
        // The mock indexer's result GUIDs are derived from the API key and the result's position rather than the
        // query, so the same underlying result can already be marked as downloaded by an earlier test in this suite
        // that happened to hit the same indexer, API key, and position. That is not what this test checks; it only
        // checks that downloading marks the result as downloaded in the very next search.

        hydraClient.get("/internalapi/nzb/" + result.getDownloadId());

        // The download is recorded asynchronously, so it may not show up in the very next search.
        await().atMost(Duration.ofSeconds(15)).untilAsserted(() -> {
            SearchResponse after = searcher.searchInternal(query);
            SearchResultWebTO downloaded = after.getSearchResults().stream()
                .filter(x -> x.getSearchResultId().equals(result.getSearchResultId()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Previously found result not found in second search"));
            assertThat(downloaded.getDownloadedAt()).isNotNull();
        });
    }
}
