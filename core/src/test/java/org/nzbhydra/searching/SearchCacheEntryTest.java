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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

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
    private Indexer indexer3;
    @Mock
    private IndexerForSearchSelection selectionResult;

    private SearchRequest searchRequest;
    private SearchCacheEntry searchCacheEntry;

    @BeforeEach
    void setUp() {
        when(indexer1.getName()).thenReturn("indexer1");
        when(indexer2.getName()).thenReturn("indexer2");
        when(indexer3.getName()).thenReturn("indexer3");
        when(selectionResult.getSelectedIndexers()).thenReturn(Arrays.asList(indexer1, indexer2));
        //An API search: it keeps the normal query cap and the newest-first merge order
        searchRequest = new SearchRequest(SearchSource.API, SearchType.SEARCH, 0, 100);
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

    @Test
    void shouldStopSearchingAnIndexerAfterTheMaximumNumberOfQueriesForLoadAllSearches() {
        searchRequest.setLoadAll(true);
        searchCacheEntry.getIndexersToSearch();
        IndexerSearchCacheEntry indexer1Entry = searchCacheEntry.getIndexerCacheEntries().get("indexer1");
        for (int i = 0; i < SearchCacheEntry.MAX_QUERIES_UNTIL_BREAK_LOAD_ALL; i++) {
            indexer1Entry.addIndexerSearchResult(indexerSearchResult(indexer1, true, List.of()));
        }

        assertThat(searchCacheEntry.getIndexersToSearch()).doesNotContain(indexer1Entry);
    }

    @Test
    void shouldAllowInternalSearchesUpToTheLoadAllQueryCap() {
        //Every web UI request after the first was explicitly asked for, e.g. "Load 5000 more"
        SearchRequest largeLimitRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 100, 5000);
        SearchCacheEntry largeLimitCacheEntry = new SearchCacheEntry(largeLimitRequest, selectionResult, new SearchEntity());
        largeLimitCacheEntry.getIndexersToSearch();
        IndexerSearchCacheEntry indexer1Entry = largeLimitCacheEntry.getIndexerCacheEntries().get("indexer1");
        for (int i = 0; i < SearchCacheEntry.MAX_QUERIES_UNTIL_BREAK; i++) {
            indexer1Entry.addIndexerSearchResult(indexerSearchResult(indexer1, true, List.of()));
        }
        //Still within the load-all cap so the indexer must still be queried
        assertThat(largeLimitCacheEntry.getIndexersToSearch()).contains(indexer1Entry);

        for (int i = SearchCacheEntry.MAX_QUERIES_UNTIL_BREAK; i < SearchCacheEntry.MAX_QUERIES_UNTIL_BREAK_LOAD_ALL; i++) {
            indexer1Entry.addIndexerSearchResult(indexerSearchResult(indexer1, true, List.of()));
        }
        assertThat(largeLimitCacheEntry.getIndexersToSearch()).doesNotContain(indexer1Entry);
    }

    @Test
    void shouldStopApiSearchWithLargeLimitAtTheNormalQueryCap() {
        //API callers must not be able to bypass the normal cap by requesting a large limit
        SearchRequest apiLargeLimitRequest = new SearchRequest(SearchSource.API, SearchType.SEARCH, 0, 500);
        SearchCacheEntry apiCacheEntry = new SearchCacheEntry(apiLargeLimitRequest, selectionResult, new SearchEntity());
        apiCacheEntry.getIndexersToSearch();
        IndexerSearchCacheEntry indexer1Entry = apiCacheEntry.getIndexerCacheEntries().get("indexer1");
        for (int i = 0; i < SearchCacheEntry.MAX_QUERIES_UNTIL_BREAK; i++) {
            indexer1Entry.addIndexerSearchResult(indexerSearchResult(indexer1, true, List.of()));
        }

        assertThat(apiCacheEntry.getIndexersToSearch()).doesNotContain(indexer1Entry);
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

    @Test
    void shouldMergeEverythingRetrievedForInternalSearches() {
        SearchCacheEntry internalCacheEntry = new SearchCacheEntry(new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100), selectionResult, new SearchEntity());
        internalCacheEntry.getIndexersToSearch();
        SearchResultItem newest = item("newest", indexer1, BASE);
        SearchResultItem older = item("older", indexer2, BASE.minus(1, ChronoUnit.DAYS));
        SearchResultItem oldest = item("oldest", indexer2, BASE.minus(2, ChronoUnit.DAYS));
        internalCacheEntry.getIndexerCacheEntries().get("indexer1").addIndexerSearchResult(indexerSearchResult(indexer1, true, List.of(newest)));
        internalCacheEntry.getIndexerCacheEntries().get("indexer2").addIndexerSearchResult(indexerSearchResult(indexer2, false, Arrays.asList(older, oldest)));

        internalCacheEntry.mergeCachedResults();

        //The web UI sorts itself, so nothing retrieved is held back although indexer 1 has more
        assertThat(internalCacheEntry.getSearchResultItems()).containsExactly(newest, older, oldest);
        assertThat(internalCacheEntry.getIndexersToSearch()).containsExactly(internalCacheEntry.getIndexerCacheEntries().get("indexer1"));
    }

    private IndexerSearchCacheEntry cacheEntryWith(Indexer indexer, boolean hasMoreResults, SearchResultItem... items) {
        IndexerSearchCacheEntry entry = new IndexerSearchCacheEntry(indexer);
        entry.addIndexerSearchResult(indexerSearchResult(indexer, hasMoreResults, Arrays.asList(items)));
        return entry;
    }

    /**
     * Replaces the indexer cache entries with the given ones, keeping their order as the map's iteration order.
     */
    private void setIndexerCacheEntriesInOrder(SearchCacheEntry cacheEntry, IndexerSearchCacheEntry... entries) {
        Map<String, IndexerSearchCacheEntry> orderedEntries = new LinkedHashMap<>();
        for (IndexerSearchCacheEntry entry : entries) {
            orderedEntries.put(entry.getIndexer().getName(), entry);
        }
        cacheEntry.setIndexerCacheEntries(orderedEntries);
    }

    @Test
    void shouldMergeThreeIndexersWithInterleavedDatesNewestFirst() {
        SearchResultItem a1 = item("a1", indexer1, BASE);
        SearchResultItem a2 = item("a2", indexer1, BASE.minus(3, ChronoUnit.HOURS));
        SearchResultItem a3 = item("a3", indexer1, BASE.minus(7, ChronoUnit.HOURS));
        SearchResultItem b1 = item("b1", indexer2, BASE.minus(1, ChronoUnit.HOURS));
        SearchResultItem b2 = item("b2", indexer2, BASE.minus(5, ChronoUnit.HOURS));
        SearchResultItem b3 = item("b3", indexer2, BASE.minus(6, ChronoUnit.HOURS));
        SearchResultItem c1 = item("c1", indexer3, BASE.minus(2, ChronoUnit.HOURS));
        SearchResultItem c2 = item("c2", indexer3, BASE.minus(4, ChronoUnit.HOURS));
        SearchResultItem c3 = item("c3", indexer3, BASE.minus(8, ChronoUnit.HOURS));
        //Items are handed over unsorted, the indexer cache entries sort them newest first
        setIndexerCacheEntriesInOrder(searchCacheEntry,
            cacheEntryWith(indexer1, false, a3, a1, a2),
            cacheEntryWith(indexer2, false, b2, b3, b1),
            cacheEntryWith(indexer3, false, c3, c2, c1));

        searchCacheEntry.mergeCachedResults();

        assertThat(searchCacheEntry.getSearchResultItems()).containsExactly(a1, b1, c1, a2, c2, b2, b3, a3, c3);
        assertThat(searchCacheEntry.getIndexersWithCachedResults()).isEmpty();
    }

    @Test
    void shouldResolveTiesBetweenIndexersByTheIterationOrderOfTheirCacheEntries() {
        Instant t0 = BASE;
        Instant t1 = BASE.minus(1, ChronoUnit.HOURS);
        Instant t2 = BASE.minus(2, ChronoUnit.HOURS);
        SearchResultItem a1 = item("a1", indexer1, t0);
        SearchResultItem a2 = item("a2", indexer1, t2);
        SearchResultItem aNoDate = item("aNoDate", indexer1, null);
        SearchResultItem b1 = item("b1", indexer2, t0);
        SearchResultItem b2 = item("b2", indexer2, t0);
        SearchResultItem b3 = item("b3", indexer2, t1);
        SearchResultItem bNoDate = item("bNoDate", indexer2, null);
        SearchResultItem c1 = item("c1", indexer3, t1);
        SearchResultItem c2 = item("c2", indexer3, t2);

        //Order indexer3, indexer1, indexer2: on equal dates the entry which comes first in that order wins
        setIndexerCacheEntriesInOrder(searchCacheEntry,
            cacheEntryWith(indexer3, false, c1, c2),
            cacheEntryWith(indexer1, false, a1, a2, aNoDate),
            cacheEntryWith(indexer2, false, b1, b2, b3, bNoDate));
        searchCacheEntry.mergeCachedResults();
        assertThat(searchCacheEntry.getSearchResultItems()).containsExactly(a1, b1, b2, c1, b3, c2, a2, aNoDate, bNoDate);

        //Same items, reversed order of the entries
        SearchCacheEntry reversed = new SearchCacheEntry(searchRequest, selectionResult, new SearchEntity());
        setIndexerCacheEntriesInOrder(reversed,
            cacheEntryWith(indexer2, false, b1, b2, b3, bNoDate),
            cacheEntryWith(indexer1, false, a1, a2, aNoDate),
            cacheEntryWith(indexer3, false, c1, c2));
        reversed.mergeCachedResults();
        assertThat(reversed.getSearchResultItems()).containsExactly(b1, b2, a1, b3, c1, a2, c2, bNoDate, aNoDate);
    }

    @Test
    void shouldStopMergingWhenOneOfThreeIndexersRanDryAndContinueAfterItWasQueriedAgain() {
        SearchResultItem a1 = item("a1", indexer1, BASE);
        SearchResultItem a2 = item("a2", indexer1, BASE.minus(6, ChronoUnit.HOURS));
        SearchResultItem b1 = item("b1", indexer2, BASE.minus(1, ChronoUnit.HOURS));
        SearchResultItem b2 = item("b2", indexer2, BASE.minus(3, ChronoUnit.HOURS));
        SearchResultItem c1 = item("c1", indexer3, BASE.minus(2, ChronoUnit.HOURS));
        IndexerSearchCacheEntry indexer1Entry = cacheEntryWith(indexer1, false, a1, a2);
        IndexerSearchCacheEntry indexer2Entry = cacheEntryWith(indexer2, true, b1);
        //Indexer 3 runs dry first in the second merge but has no more results, so it must not stop the merge
        IndexerSearchCacheEntry indexer3Entry = cacheEntryWith(indexer3, false, c1);
        setIndexerCacheEntriesInOrder(searchCacheEntry, indexer1Entry, indexer2Entry, indexer3Entry);

        searchCacheEntry.mergeCachedResults();

        //Indexer 2 ran dry but might deliver items newer than c1, so merging stops although others have cached items
        assertThat(searchCacheEntry.getSearchResultItems()).containsExactly(a1, b1);
        assertThat(searchCacheEntry.getIndexersWithCachedResults()).containsExactly(indexer1Entry, indexer3Entry);

        indexer2Entry.addIndexerSearchResult(indexerSearchResult(indexer2, false, List.of(b2)));
        searchCacheEntry.mergeCachedResults();

        assertThat(searchCacheEntry.getSearchResultItems()).containsExactly(a1, b1, c1, b2, a2);
        assertThat(searchCacheEntry.getIndexersWithCachedResults()).isEmpty();
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
        SearchCacheEntry searchCacheEntry = new SearchCacheEntry(new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100), selectionResult, new SearchEntity());
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
