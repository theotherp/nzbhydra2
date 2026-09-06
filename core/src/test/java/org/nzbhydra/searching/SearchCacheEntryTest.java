package org.nzbhydra.searching;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.searching.IndexerForSearchSelector.IndexerForSearchSelection;
import org.nzbhydra.searching.db.SearchEntity;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.searchrequests.SearchRequest;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SearchCacheEntryTest {

    private static final Instant BASE = Instant.parse("2024-01-01T00:00:00Z");

    @Mock
    private Indexer indexer1;
    @Mock
    private Indexer indexer2;
    @Mock
    private IndexerForSearchSelection selectionResult;

    private SearchRequest searchRequest;
    private SearchCacheEntry searchCacheEntry;

    @BeforeEach
    void setUp() {
        when(indexer1.getName()).thenReturn("indexer1");
        when(indexer2.getName()).thenReturn("indexer2");
        when(selectionResult.getSelectedIndexers()).thenReturn(Arrays.asList(indexer1, indexer2));
        searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchCacheEntry = new SearchCacheEntry(searchRequest, selectionResult, new SearchEntity());
    }

    private SearchResultItem item(String title, Indexer indexer, Instant pubDate) {
        SearchResultItem item = new SearchResultItem();
        item.setTitle(title);
        item.setIndexer(indexer);
        item.setPubDate(pubDate);
        return item;
    }

    private IndexerSearchResult indexerSearchResult(Indexer indexer, boolean hasMoreResults, List<SearchResultItem> items) {
        IndexerSearchResult indexerSearchResult = new IndexerSearchResult();
        indexerSearchResult.setIndexer(indexer);
        indexerSearchResult.setSearchResultItems(items);
        indexerSearchResult.setWasSuccessful(true);
        indexerSearchResult.setHasMoreResults(hasMoreResults);
        indexerSearchResult.setTotalResults(items.size());
        indexerSearchResult.setPageSize(Math.max(items.size(), 1));
        return indexerSearchResult;
    }

    // ------------------------------------------------------------------------------------------------
    // getIndexersToSearch
    // ------------------------------------------------------------------------------------------------

    @Test
    void shouldCreateMissingCacheEntriesAndReturnAllIndexersWithoutResults() {
        List<IndexerSearchCacheEntry> indexersToSearch = searchCacheEntry.getIndexersToSearch();

        assertThat(searchCacheEntry.getIndexerCacheEntries()).containsOnlyKeys("indexer1", "indexer2");
        assertThat(indexersToSearch).hasSize(2);
    }

    @Test
    void shouldNotReturnIndexerWhoseLastRequestFailedOrWhichHasNoMoreResults() {
        searchCacheEntry.getIndexersToSearch();

        IndexerSearchResult failed = indexerSearchResult(indexer1, true, List.of());
        failed.setWasSuccessful(false);
        searchCacheEntry.getIndexerCacheEntries().get("indexer1").addIndexerSearchResult(failed);
        searchCacheEntry.getIndexerCacheEntries().get("indexer2").addIndexerSearchResult(indexerSearchResult(indexer2, false, List.of()));

        assertThat(searchCacheEntry.getIndexersToSearch()).isEmpty();
    }

    @Test
    void shouldStopSearchingAnIndexerAfterTheMaximumNumberOfQueriesUnlessAllResultsAreWanted() {
        searchCacheEntry.getIndexersToSearch();
        IndexerSearchCacheEntry indexer1Entry = searchCacheEntry.getIndexerCacheEntries().get("indexer1");
        for (int i = 0; i < SearchCacheEntry.MAX_QUERIES_UNTIL_BREAK; i++) {
            indexer1Entry.addIndexerSearchResult(indexerSearchResult(indexer1, true, List.of()));
        }

        assertThat(searchCacheEntry.getIndexersToSearch()).doesNotContain(indexer1Entry);

        searchRequest.setLoadAll(true);
        assertThat(searchCacheEntry.getIndexersToSearch()).contains(indexer1Entry);
    }

    // ------------------------------------------------------------------------------------------------
    // getIndexersWithCachedResults
    // ------------------------------------------------------------------------------------------------

    @Test
    void shouldOnlyReturnIndexersWhichStillHaveItemsInTheirCache() {
        searchCacheEntry.getIndexersToSearch();
        IndexerSearchCacheEntry indexer1Entry = searchCacheEntry.getIndexerCacheEntries().get("indexer1");
        indexer1Entry.addIndexerSearchResult(indexerSearchResult(indexer1, false, List.of(item("a", indexer1, BASE))));

        assertThat(searchCacheEntry.getIndexersWithCachedResults()).containsExactly(indexer1Entry);

        indexer1Entry.pop();
        assertThat(searchCacheEntry.getIndexersWithCachedResults()).isEmpty();
    }

    // ------------------------------------------------------------------------------------------------
    // mergeCachedResults
    // ------------------------------------------------------------------------------------------------

    @Test
    void shouldMergeCachedResultsOfAllIndexersNewestFirst() {
        searchCacheEntry.getIndexersToSearch();
        SearchResultItem newest = item("newest", indexer1, BASE);
        SearchResultItem third = item("third", indexer1, BASE.minus(3, ChronoUnit.DAYS));
        SearchResultItem second = item("second", indexer2, BASE.minus(1, ChronoUnit.DAYS));
        SearchResultItem oldest = item("oldest", indexer2, BASE.minus(10, ChronoUnit.DAYS));
        searchCacheEntry.getIndexerCacheEntries().get("indexer1").addIndexerSearchResult(indexerSearchResult(indexer1, false, Arrays.asList(newest, third)));
        searchCacheEntry.getIndexerCacheEntries().get("indexer2").addIndexerSearchResult(indexerSearchResult(indexer2, false, Arrays.asList(second, oldest)));

        searchCacheEntry.mergeCachedResults();

        assertThat(searchCacheEntry.getSearchResultItems()).containsExactly(newest, second, third, oldest);
        assertThat(searchCacheEntry.getIndexersWithCachedResults()).isEmpty();
    }

    @Test
    void shouldStopMergingWhenAnIndexerRanDryButStillHasMoreResultsAvailable() {
        searchCacheEntry.getIndexersToSearch();
        SearchResultItem newest = item("newest", indexer1, BASE);
        SearchResultItem older = item("older", indexer2, BASE.minus(1, ChronoUnit.DAYS));
        SearchResultItem oldest = item("oldest", indexer2, BASE.minus(2, ChronoUnit.DAYS));
        searchCacheEntry.getIndexerCacheEntries().get("indexer1").addIndexerSearchResult(indexerSearchResult(indexer1, true, List.of(newest)));
        searchCacheEntry.getIndexerCacheEntries().get("indexer2").addIndexerSearchResult(indexerSearchResult(indexer2, false, Arrays.asList(older, oldest)));

        searchCacheEntry.mergeCachedResults();

        //Indexer 1 might still deliver items which are newer than indexer 2's, so merging must stop
        assertThat(searchCacheEntry.getSearchResultItems()).containsExactly(newest);
        assertThat(searchCacheEntry.getIndexersToSearch()).containsExactly(searchCacheEntry.getIndexerCacheEntries().get("indexer1"));
    }

    // ------------------------------------------------------------------------------------------------
    // mergeCachedResults and duplicates
    // ------------------------------------------------------------------------------------------------

    /**
     * Creates a cache entry for an API search and puts the two items into one duplicate group.
     */
    private SearchCacheEntry apiSearchCacheEntryWithOneDuplicateGroup(SearchResultItem itemOfIndexer1, SearchResultItem itemOfIndexer2) {
        SearchRequest apiSearchRequest = new SearchRequest(SearchSource.API, SearchType.SEARCH, 0, 100);
        SearchCacheEntry apiCacheEntry = new SearchCacheEntry(apiSearchRequest, selectionResult, new SearchEntity());
        apiCacheEntry.getIndexersToSearch();
        apiCacheEntry.getIndexerCacheEntries().get("indexer1").addIndexerSearchResult(indexerSearchResult(indexer1, false, List.of(itemOfIndexer1)));
        apiCacheEntry.getIndexerCacheEntries().get("indexer2").addIndexerSearchResult(indexerSearchResult(indexer2, false, List.of(itemOfIndexer2)));
        DuplicateGroups.DuplicateGroup group = apiCacheEntry.getDuplicateGroups().createGroup(itemOfIndexer1);
        apiCacheEntry.getDuplicateGroups().addToGroup(group, itemOfIndexer2);
        return apiCacheEntry;
    }

    @Test
    void shouldOnlyAddOneItemOfADuplicateGroupForApiSearchesAndCountTheOtherAsRemoved() {
        SearchResultItem newest = item("duplicate", indexer1, BASE);
        SearchResultItem older = item("duplicate", indexer2, BASE.minus(1, ChronoUnit.DAYS));
        SearchCacheEntry apiCacheEntry = apiSearchCacheEntryWithOneDuplicateGroup(newest, older);

        apiCacheEntry.mergeCachedResults();

        assertThat(apiCacheEntry.getSearchResultItems()).containsExactly(newest);
        assertThat(apiCacheEntry.getNumberOfRemovedDuplicates()).isEqualTo(1);
        //Both items are identifiable as belonging to the same group
        assertThat(newest.getDuplicateIdentifier()).isEqualTo(older.getDuplicateIdentifier());
    }

    @Test
    void shouldPreferTheHigherScoredMemberOfADuplicateGroupEvenIfItIsPoppedLater() {
        SearchResultItem newestButLowerScore = item("duplicate", indexer1, BASE);
        newestButLowerScore.setIndexerScore(1);
        SearchResultItem olderButHigherScore = item("duplicate", indexer2, BASE.minus(1, ChronoUnit.DAYS));
        olderButHigherScore.setIndexerScore(5);
        SearchCacheEntry apiCacheEntry = apiSearchCacheEntryWithOneDuplicateGroup(newestButLowerScore, olderButHigherScore);

        apiCacheEntry.mergeCachedResults();

        assertThat(apiCacheEntry.getSearchResultItems()).containsExactly(olderButHigherScore);
        assertThat(apiCacheEntry.getNumberOfRemovedDuplicates()).isEqualTo(1);
    }

    @Test
    void shouldKeepAllMembersOfADuplicateGroupForInternalSearches() {
        SearchResultItem newest = item("duplicate", indexer1, BASE);
        SearchResultItem older = item("duplicate", indexer2, BASE.minus(1, ChronoUnit.DAYS));
        searchCacheEntry.getIndexersToSearch();
        searchCacheEntry.getIndexerCacheEntries().get("indexer1").addIndexerSearchResult(indexerSearchResult(indexer1, false, List.of(newest)));
        searchCacheEntry.getIndexerCacheEntries().get("indexer2").addIndexerSearchResult(indexerSearchResult(indexer2, false, List.of(older)));
        DuplicateGroups.DuplicateGroup group = searchCacheEntry.getDuplicateGroups().createGroup(newest);
        searchCacheEntry.getDuplicateGroups().addToGroup(group, older);

        searchCacheEntry.mergeCachedResults();

        assertThat(searchCacheEntry.getSearchResultItems()).containsExactly(newest, older);
        assertThat(searchCacheEntry.getNumberOfRemovedDuplicates()).isZero();
        assertThat(newest.getDuplicateIdentifier()).isEqualTo(older.getDuplicateIdentifier());
    }

    // ------------------------------------------------------------------------------------------------
    // updateReasonsForRejection
    // ------------------------------------------------------------------------------------------------

    @Test
    void shouldAggregateReasonsForRejectionOverAllIndexersAndPagesWithoutCountingThemTwice() {
        searchCacheEntry.getIndexersToSearch();
        IndexerSearchResult indexer1Page1 = indexerSearchResult(indexer1, true, List.of());
        indexer1Page1.getReasonsForRejection().add("tooOld", 2);
        IndexerSearchResult indexer1Page2 = indexerSearchResult(indexer1, false, List.of());
        indexer1Page2.getReasonsForRejection().add("tooOld");
        searchCacheEntry.getIndexerCacheEntries().get("indexer1").addIndexerSearchResult(indexer1Page1);
        searchCacheEntry.getIndexerCacheEntries().get("indexer1").addIndexerSearchResult(indexer1Page2);
        IndexerSearchResult indexer2Page1 = indexerSearchResult(indexer2, false, List.of());
        indexer2Page1.getReasonsForRejection().add("forbiddenWord");
        searchCacheEntry.getIndexerCacheEntries().get("indexer2").addIndexerSearchResult(indexer2Page1);

        searchCacheEntry.updateReasonsForRejection();
        //Calling it twice must not double the counts
        searchCacheEntry.updateReasonsForRejection();

        assertThat(searchCacheEntry.getReasonsForRejection().count("tooOld")).isEqualTo(3);
        assertThat(searchCacheEntry.getReasonsForRejection().count("forbiddenWord")).isEqualTo(1);
        assertThat(searchCacheEntry.getNumberOfRejectedResults()).isEqualTo(4);
    }

}
