

package org.nzbhydra;

import org.junit.jupiter.api.Test;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.downloading.FileDownloadEntityTO;
import org.nzbhydra.historystats.SortModel;
import org.nzbhydra.historystats.stats.HistoryRequest;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.searching.db.IdentifierKeyValuePairTO;
import org.nzbhydra.searching.db.SearchEntityTO;
import org.springframework.beans.factory.annotation.Autowired;
import tools.jackson.core.type.TypeReference;

import java.time.Duration;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

/**
 * The history endpoints, asserted against rows this class can name.
 *
 * <p>Every search made here carries a marker unique to the run, and every assertion below finds its row by that marker
 * rather than by its position in the page. The two are not equivalent: the newest three rows are only this test's rows
 * if nothing else has searched since, and under {@code -Dsurefire.runOrder=random} plenty of classes may have. A
 * position-based lookup that happened to pass was reading whichever rows the schedule had left on top, and
 * {@code BackupRestoreSystemTest} rewinds the shared database to an earlier state by design, so even "newer" is not a
 * property this class can assume of the database as a whole.
 *
 * <p>What the markers do not weaken is the ordering. The three searches are made in a known sequence, and the
 * assertions still prove that the descending page ranks them newest-first and that their timestamps decrease across
 * them - and, more than the positional version did, that each page is sorted end to end rather than only in its first
 * two rows.
 */
@SystemTest
public class HistoryTest {

    @Autowired
    private HydraClient hydraClient;

    @Autowired
    private Searcher searcher;

    @Autowired
    private TestDownloader downloader;

    @Test
    public void shouldShowSearchHistory() throws Exception {
        String marker = marker();
        String query = "historyTest-" + marker;
        // The mock indexer branches on the *presence* of imdbid/tvmazeid, never on their value (MockNewznab), and the
        // core stores the id it was given - prefixed with "tt" for IMDB. So a marker can be carried in the id itself.
        String imdbId = "imdbid" + marker;
        String tvMazeId = "tvmazeid" + marker;

        searcher.searchExternalApi(query);
        searcher.searchExternalApiMovie(imdbId);
        searcher.searchExternalApiTV(tvMazeId, 1, 2);

        await().atMost(Duration.ofSeconds(15)).untilAsserted(() -> {
            List<SearchEntityTO> searches = searchHistory(newestFirst());
            assertThat(findByQuery(searches, query)).isNotNull();
            assertThat(findByIdentifier(searches, "IMDB", "tt" + imdbId)).isNotNull();
            assertThat(findByIdentifier(searches, "TVMAZE", tvMazeId)).isNotNull();
        });

        List<SearchEntityTO> newestFirst = searchHistory(newestFirst());
        SearchEntityTO tvSearch = findByIdentifier(newestFirst, "TVMAZE", tvMazeId);
        SearchEntityTO movieSearch = findByIdentifier(newestFirst, "IMDB", "tt" + imdbId);
        SearchEntityTO querySearch = findByQuery(newestFirst, query);

        assertThat(tvSearch.getIdentifiers()).contains(new IdentifierKeyValuePairTO("TVMAZE", tvMazeId));
        assertThat(tvSearch.getSeason()).isEqualTo(1);
        assertThat(tvSearch.getEpisode()).isEqualTo("2");
        assertThat(tvSearch.getSearchType()).isEqualTo(SearchType.TVSEARCH);

        assertThat(movieSearch.getIdentifiers()).contains(new IdentifierKeyValuePairTO("IMDB", "tt" + imdbId));
        assertThat(movieSearch.getSearchType()).isEqualTo(SearchType.MOVIE);

        assertThat(querySearch.getSearchType()).isEqualTo(SearchType.SEARCH);
        assertThat(querySearch.getQuery()).isEqualTo(query);
        assertThat(querySearch.getUserAgent()).isEqualTo("Other");

        assertThat(tvSearch.getTime()).isAfter(movieSearch.getTime());
        assertThat(movieSearch.getTime()).isAfter(querySearch.getTime());

        // Descending, this test's three rows are the newest there are, so they are on the page whatever else the
        // database holds, and they appear in the reverse of the order they were made.
        assertThat(newestFirst).isSortedAccordingTo(Comparator.comparing(SearchEntityTO::getTime).reversed());
        assertThat(ownRowIds(newestFirst, tvSearch, movieSearch, querySearch))
                .containsExactly(tvSearch.getId(), movieSearch.getId(), querySearch.getId());

        // Ascending, page 1 is the *oldest* hundred rows (HistoryRequest defaults to page 1, limit 100), which need
        // not contain this test's at all. What the ascending sort has to prove is that it orders the other way round,
        // and that is a property of the page itself rather than of which rows landed on it.
        assertThat(searchHistory(oldestFirst())).isSortedAccordingTo(Comparator.comparing(SearchEntityTO::getTime));
    }

    @Test
    public void shouldShowSearchHistoryForSearching() throws Exception {
        String query = "internalQueryForHistoryTest-" + marker();
        searcher.searchInternal(query);

        List<SearchEntityTO> list = hydraClient.post("/internalapi/history/searches/forsearching", newestFirst())
                .as(new TypeReference<>() {
                });

        assertThat(list).isNotEmpty();
        // This search is the most recent one there is - nothing else runs between the call above and this one - so the
        // marker must be on the first row, not merely somewhere in the list.
        assertThat(list.get(0).getQuery()).isEqualTo(query);
    }

    @Test
    public void shouldShowDownloadHistory() throws Exception {
        NewznabXmlItem downloadedItem = downloader.searchSomethingAndTriggerDownload("downloadHistoryTest-" + marker());

        // The download is recorded asynchronously, so the row may not be there on the first read. Waiting for it beats
        // asserting on whatever the previous class downloaded.
        await().atMost(Duration.ofSeconds(15)).untilAsserted(() ->
                assertThat(downloadHistory()).isNotEmpty()
                        .first()
                        .satisfies(entry -> assertThat(entry.getSearchResult().getTitle()).isEqualTo(downloadedItem.getTitle())));
    }

    private String marker() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    private HistoryRequest newestFirst() {
        HistoryRequest historyRequest = new HistoryRequest();
        historyRequest.setSortModel(new SortModel("time", 0));
        return historyRequest;
    }

    private HistoryRequest oldestFirst() {
        HistoryRequest historyRequest = new HistoryRequest();
        historyRequest.setSortModel(new SortModel("time", 1));
        return historyRequest;
    }

    private List<SearchEntityTO> searchHistory(HistoryRequest request) {
        HydraPage<SearchEntityTO> page = hydraClient.post("/internalapi/history/searches", request)
                .as(new TypeReference<>() {
                });
        assertThat(page.isEmpty()).isFalse();
        return page.getContent();
    }

    private List<FileDownloadEntityTO> downloadHistory() {
        HydraPage<FileDownloadEntityTO> page = hydraClient.post("/internalapi/history/downloads", newestFirst())
                .as(new TypeReference<>() {
                });
        return page.getContent();
    }

    private SearchEntityTO findByQuery(List<SearchEntityTO> searches, String query) {
        return searches.stream()
                .filter(search -> query.equals(search.getQuery()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("No search history entry with query " + query));
    }

    private SearchEntityTO findByIdentifier(List<SearchEntityTO> searches, String identifierName, String identifierValue) {
        return searches.stream()
                .filter(search -> search.getIdentifiers() != null
                        && search.getIdentifiers().contains(new IdentifierKeyValuePairTO(identifierName, identifierValue)))
                .findFirst()
                .orElseThrow(() -> new AssertionError("No search history entry with identifier " + identifierName + "=" + identifierValue));
    }

    private List<Integer> ownRowIds(List<SearchEntityTO> searches, SearchEntityTO... own) {
        List<Integer> ownIds = java.util.Arrays.stream(own).map(SearchEntityTO::getId).toList();
        return searches.stream().map(SearchEntityTO::getId).filter(ownIds::contains).toList();
    }
}
