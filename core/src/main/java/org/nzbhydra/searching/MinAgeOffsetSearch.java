package org.nzbhydra.searching;

import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.springnative.ReflectionMarker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

/**
 * Finds the first result of an indexer which is old enough for a search with a minimum age by bisecting the offset
 * instead of loading all younger results page by page. Most indexers can't filter by a minimum age themselves (newznab
 * only knows maxage) but return their results newest first. Paging through all younger results would take many queries
 * and run into the circuit breaker of {@link SearchCacheEntry} long before the first result old enough is reached.
 * <p>
 * Only pages which are part of the contiguous sequence of results from the boundary on may be kept. A probe behind the
 * boundary is discarded, otherwise its results would be merged before the ones between boundary and probe were loaded.
 * If the indexer turns out not to return its results newest first loading resumes after the last page known to only
 * contain results which are too young.
 */
@ReflectionMarker
public class MinAgeOffsetSearch {

    private static final Logger logger = LoggerFactory.getLogger(MinAgeOffsetSearch.class);

    private enum State {
        /**
         * Waiting for the first page.
         */
        STARTING,
        /**
         * Bisecting the offsets between the last page known to be too young and the first result known to be old enough.
         */
        PROBING,
        /**
         * The indexer doesn't return its results newest first. The next page is loaded right after the last one known
         * to be too young, then loading continues page by page.
         */
        RESUMING,
        /**
         * Loading continues page by page.
         */
        DONE,
        /**
         * The indexer has no result old enough.
         */
        NOTHING_OLD_ENOUGH
    }

    private final String indexerName;
    private final int minAgeDays;
    private State state = State.STARTING;
    /**
     * No result before this offset is old enough.
     */
    private int lowerBound;
    /**
     * The result at this offset is old enough or doesn't exist.
     */
    private int upperBound;
    private int pageSize;
    /**
     * The date of the oldest result of the last page which was too young. Every later page must be older.
     */
    private Instant oldestTooYoungDate;
    private int probes;

    public MinAgeOffsetSearch(String indexerName, int minAgeDays) {
        this.indexerName = indexerName;
        this.minAgeDays = minAgeDays;
    }

    /**
     * Evaluates a page which was loaded from the indexer.
     *
     * @return false if the page's results must be discarded because they don't directly follow the ones before them
     */
    public boolean pageLoaded(IndexerSearchResult page) {
        if (!page.isWasSuccessful()) {
            state = State.DONE;
            return true;
        }
        return switch (state) {
            case STARTING -> firstPageLoaded(page);
            case PROBING -> probeLoaded(page);
            case RESUMING -> {
                state = State.DONE;
                yield true;
            }
            default -> true;
        };
    }

    public int getNextOffset(IndexerSearchResult lastPage) {
        return switch (state) {
            case PROBING -> upperBound - lowerBound <= pageSize ? lowerBound : lowerBound + (upperBound - lowerBound) / 2;
            case RESUMING -> lowerBound;
            default -> lastPage.getOffset() + lastPage.getPageSize();
        };
    }

    /**
     * @return the number of pages loaded to find the first result old enough. Their number is limited by the bisection.
     */
    public int getProbes() {
        return probes;
    }

    /**
     * @return whether the first result old enough hasn't been loaded yet although the indexer may have one
     */
    public boolean isSearchingFirstOldEnough() {
        return state == State.PROBING || state == State.RESUMING;
    }

    public boolean isMoreResultsAvailable(IndexerSearchResult lastPage) {
        return switch (state) {
            case PROBING, RESUMING -> true;
            case NOTHING_OLD_ENOUGH -> false;
            default -> lastPage.isHasMoreResults();
        };
    }

    private boolean firstPageLoaded(IndexerSearchResult page) {
        if (!page.isTotalResultsKnown() || !page.isHasMoreResults() || !page.isSortedNewestFirst()
            || page.getOldestResultDate() == null || isOldEnough(page.getOldestResultDate())) {
            state = State.DONE;
            return true;
        }
        pageSize = page.getPageSize();
        lowerBound = page.getOffset() + pageSize;
        upperBound = page.getTotalResults();
        oldestTooYoungDate = page.getOldestResultDate();
        state = State.PROBING;
        logger.info("All results of the first page of {} are younger than {} days. Will look for the first older one between offsets {} and {}", indexerName, minAgeDays, lowerBound, upperBound);
        return true;
    }

    private boolean probeLoaded(IndexerSearchResult page) {
        probes++;
        final int offset = page.getOffset();
        final boolean contiguous = offset == lowerBound;

        if (page.getPageSize() == 0 || page.getOldestResultDate() == null) {
            //Beyond the last result
            upperBound = Math.min(upperBound, offset);
            if (contiguous) {
                logger.info("{} has no results older than {} days", indexerName, minAgeDays);
                state = State.NOTHING_OLD_ENOUGH;
            }
            return contiguous;
        }

        if (!page.isSortedNewestFirst() || page.getNewestResultDate().isAfter(oldestTooYoungDate.plus(IndexerSearchResult.SORT_ORDER_TOLERANCE))) {
            logger.info("{} doesn't return results newest first. Will load all results from offset {} on", indexerName, lowerBound);
            state = contiguous ? State.DONE : State.RESUMING;
            return contiguous;
        }

        if (!isOldEnough(page.getOldestResultDate())) {
            //All results too young. They're all rejected so the page may be kept for its rejection reasons
            lowerBound = Math.max(lowerBound, offset + page.getPageSize());
            oldestTooYoungDate = page.getOldestResultDate();
            return true;
        }

        if (isOldEnough(page.getNewestResultDate())) {
            //All results old enough
            upperBound = Math.min(upperBound, offset);
            if (contiguous) {
                boundaryFound(offset);
                return true;
            }
            return false;
        }

        //The newest result is too young and the oldest old enough. Because the results are sorted all results before
        //this page are too young as well
        boundaryFound(offset);
        return true;
    }

    private void boundaryFound(int offset) {
        logger.info("Found the first results of {} older than {} days on the page at offset {} after {} probes", indexerName, minAgeDays, offset, probes);
        state = State.DONE;
    }

    private boolean isOldEnough(Instant date) {
        //Same calculation as used for rejecting results, see SearchResultItem.getAgeInDays()
        return date.until(Instant.now(), ChronoUnit.DAYS) >= minAgeDays;
    }

}
