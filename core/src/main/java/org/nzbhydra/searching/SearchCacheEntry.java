package org.nzbhydra.searching;

import com.google.common.collect.HashMultiset;
import com.google.common.collect.Iterables;
import com.google.common.collect.Multiset;
import lombok.Getter;
import lombok.Setter;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.searching.IndexerForSearchSelector.IndexerForSearchSelection;
import org.nzbhydra.searching.db.SearchEntity;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.springnative.ReflectionMarker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Getter
@Setter
@ReflectionMarker
public class SearchCacheEntry {

    /**
     * Maximum number of queries sent to a single indexer for one search unless all results are to be loaded.
     */
    static final int MAX_QUERIES_UNTIL_BREAK = 15;

    /**
     * Maximum number of queries sent to a single indexer for one load-all search. Generous because loading all results
     * legitimately needs many pages, but still a hard backstop against indexers which never stop reporting more results.
     */
    static final int MAX_QUERIES_UNTIL_BREAK_LOAD_ALL = MAX_QUERIES_UNTIL_BREAK * 10;

    private static final Logger logger = LoggerFactory.getLogger(SearchCacheEntry.class);

    /**
     * Orders the members of a duplicate group so that the one which should be returned to an API caller comes first:
     * highest indexer score (unknown score counts as 0), newest first.
     */
    private static final Comparator<SearchResultItem> BEST_DUPLICATE_FIRST =
        Comparator.comparingInt((SearchResultItem x) -> x.getIndexerScore() == null ? 0 : x.getIndexerScore())
            .reversed()
            .thenComparing(SearchResultItem.NEWEST_FIRST);

    private Instant lastAccessed;
    private SearchRequest searchRequest;
    private Map<String, IndexerSearchCacheEntry> indexerCacheEntries = new HashMap<>();
    private List<SearchResultItem> searchResultItems = new ArrayList<>();
    private IndexerForSearchSelection indexerSelectionResult;
    private SearchEntity searchEntity;
    private Multiset<String> reasonsForRejection = HashMultiset.create();
    private int numberOfRemovedDuplicates;
    private Integer numberOfAvailableResults = null;
    /**
     * Groups of results which were found to be duplicates of each other. Filled incrementally while the search runs.
     */
    private final DuplicateGroups duplicateGroups = new DuplicateGroups();


    public SearchCacheEntry(SearchRequest searchRequest, IndexerForSearchSelection indexerSelectionResult, SearchEntity searchEntity) {
        this.searchRequest = searchRequest;
        this.searchEntity = searchEntity;
        this.indexerSelectionResult = indexerSelectionResult;
        lastAccessed = Instant.now();
    }

    public int getNumberOfRejectedResults() {
        return reasonsForRejection.entrySet().stream().mapToInt(Multiset.Entry::getCount).sum();
    }

    public int getNumberOfTotalAvailableResults() {
        numberOfAvailableResults = indexerCacheEntries.values().stream().filter(x -> !x.getIndexerSearchResults().isEmpty())
            .mapToInt(x -> {
                //In some cases the total results number is wrong
                int totalResults = Iterables.getLast(x.getIndexerSearchResults()).getTotalResults();
                int actualResults = x.getSearchResultItems().size();
                return Math.max(totalResults, actualResults);
            })
            .sum();
        return numberOfAvailableResults;
    }

    public int getNumberOfFoundResults() {
        return numberOfAvailableResults = indexerCacheEntries.values().stream().mapToInt(x -> x.getSearchResultItems().size()).sum();
    }


    /**
     * Returns the indexers which should be queried (again) because their cache of results is exhausted. Creates
     * missing per-indexer entries for all selected indexers on the way.
     */
    public List<IndexerSearchCacheEntry> getIndexersToSearch() {
        for (Indexer selectedIndexer : indexerSelectionResult.getSelectedIndexers()) {
            indexerCacheEntries.putIfAbsent(selectedIndexer.getName(), new IndexerSearchCacheEntry(selectedIndexer));
        }

        List<IndexerSearchCacheEntry> indexersToSearch = new ArrayList<>();
        for (IndexerSearchCacheEntry indexerSearchCacheEntry : indexerCacheEntries.values()) {
            final int executedSearches = indexerSearchCacheEntry.getIndexerSearchResults().size();
            final int maxQueries = searchRequest.isLoadAll() ? MAX_QUERIES_UNTIL_BREAK_LOAD_ALL : MAX_QUERIES_UNTIL_BREAK;
            if (executedSearches >= maxQueries) {
                //Circuit breaker
                logger.warn("Indexer {} executed {} queries for a {}search. Will stop now", indexerSearchCacheEntry.getIndexer().getName(), executedSearches, searchRequest.isLoadAll() ? "load-all " : "");
                continue;
            }
            if (indexerSearchCacheEntry.getIndexerSearchResults().isEmpty()) {
                indexersToSearch.add(indexerSearchCacheEntry);
                continue;
            }
            boolean indexerHasMoreResults = indexerSearchCacheEntry.isMoreResultsAvailable();
            boolean lastRequestSuccessful = indexerSearchCacheEntry.isLastSuccessful();
            boolean cacheEmpty = !indexerSearchCacheEntry.isMoreResultsInCache();
            if (indexerHasMoreResults && lastRequestSuccessful && cacheEmpty) {
                indexersToSearch.add(indexerSearchCacheEntry);
            }
        }

        if (indexersToSearch.isEmpty()) {
            logger.debug("All indexer caches exhausted");
        } else {
            String indexersToCall = indexersToSearch.stream().map(x -> x.getIndexer().getName()).collect(Collectors.joining(", "));
            logger.debug("Going to call {} because their cache is exhausted", indexersToCall);
        }

        return indexersToSearch;
    }

    public List<IndexerSearchCacheEntry> getIndexersWithCachedResults() {
        return indexerCacheEntries.values().stream()
            .filter(IndexerSearchCacheEntry::isMoreResultsInCache)
            .collect(Collectors.toList());
    }

    /**
     * Pops the newest cached result item of all indexers into {@link #searchResultItems} until either all indexer
     * caches are empty or the indexer which just ran dry still has more results available. In the latter case the
     * caller needs to query that indexer again before merging can continue, otherwise the merged order would be wrong.
     * <p>
     * For API searches only one item of every duplicate group is added, see {@link #shouldBeAdded(SearchResultItem)}.
     */
    public void mergeCachedResults() {
        final boolean removeDuplicates = searchRequest.getSource() == SearchSource.API;
        List<IndexerSearchCacheEntry> indexersWithCachedResults = getIndexersWithCachedResults();
        while (!indexersWithCachedResults.isEmpty()) {
            IndexerSearchCacheEntry entryWithNewestResult = indexersWithCachedResults.stream()
                .min(Comparator.comparing(IndexerSearchCacheEntry::peek, SearchResultItem.NEWEST_FIRST))
                .orElseThrow();
            SearchResultItem item = entryWithNewestResult.pop();
            if (!removeDuplicates || shouldBeAdded(item)) {
                searchResultItems.add(item);
            } else {
                numberOfRemovedDuplicates++;
            }

            indexersWithCachedResults = getIndexersWithCachedResults();
            if (!entryWithNewestResult.isMoreResultsInCache() && entryWithNewestResult.isMoreResultsAvailable()) {
                //We need to make a new search for that indexer so we need to stop here
                break;
            }
        }
    }

    /**
     * Decides if a just popped item may be added to the merged results of an API search. Only one item of every
     * duplicate group is returned, namely the one with the highest indexer score (newest wins on equal scores). An
     * item is skipped if its group is already represented or if a better member of its group is still waiting in an
     * indexer's cache; that better one is added when it is popped later.
     */
    private boolean shouldBeAdded(SearchResultItem item) {
        DuplicateGroups.DuplicateGroup group = duplicateGroups.getGroup(item);
        if (group == null) {
            //Not grouped at all, e.g. because the item was added to the cache without duplicate detection
            return true;
        }
        if (group.isRepresented()) {
            logger.debug(LoggingMarkers.DUPLICATES, "Skipping {} because its duplicate group is already represented", item);
            return false;
        }
        SearchResultItem best = group.getItems().stream()
            .filter(x -> x == item || !isConsumed(x))
            .min(BEST_DUPLICATE_FIRST)
            .orElse(item);
        if (best != item) {
            logger.debug(LoggingMarkers.DUPLICATES, "Skipping {} because {} of the same duplicate group is preferred", item, best);
            return false;
        }
        group.setRepresented(true);
        return true;
    }

    /**
     * Returns true if the item was already popped from its indexer's cache.
     */
    private boolean isConsumed(SearchResultItem item) {
        IndexerSearchCacheEntry indexerSearchCacheEntry = indexerCacheEntries.get(item.getIndexer().getName());
        return indexerSearchCacheEntry != null && indexerSearchCacheEntry.isPopped(item);
    }

    /**
     * Rebuilds the rejection counts from all searches, this and previous.
     */
    public void updateReasonsForRejection() {
        reasonsForRejection.clear();
        for (IndexerSearchCacheEntry indexerSearchCacheEntry : indexerCacheEntries.values()) {
            for (IndexerSearchResult indexerSearchResult : indexerSearchCacheEntry.getIndexerSearchResults()) {
                for (Multiset.Entry<String> rejectionEntry : indexerSearchResult.getReasonsForRejection().entrySet()) {
                    reasonsForRejection.add(rejectionEntry.getElement(), rejectionEntry.getCount());
                }
            }
        }
    }

}
