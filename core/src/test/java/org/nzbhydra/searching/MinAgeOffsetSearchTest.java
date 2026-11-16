package org.nzbhydra.searching;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

class MinAgeOffsetSearchTest {

    private static final int PAGE_SIZE = 100;
    private static final int MIN_AGE_DAYS = 50;

    @Test
    void shouldContinueNormallyWhenFirstPageIsAlreadyOldEnough() {
        FakeIndexer indexer = FakeIndexer.withBoundaryAt(1000, 0);
        MinAgeOffsetSearch testee = new MinAgeOffsetSearch("indexer", MIN_AGE_DAYS);

        IndexerSearchResult firstPage = indexer.page(0);
        assertThat(testee.pageLoaded(firstPage)).isTrue();

        assertThat(testee.isSearchingFirstOldEnough()).isFalse();
        assertThat(testee.getNextOffset(firstPage)).isEqualTo(PAGE_SIZE);
        assertThat(testee.isMoreResultsAvailable(firstPage)).isTrue();
        assertThat(testee.getProbes()).isZero();
    }

    @Test
    void shouldNotBisectWhenFirstPageIsOnlyPartlyTooYoung() {
        FakeIndexer indexer = FakeIndexer.withBoundaryAt(1000, 40);
        MinAgeOffsetSearch testee = new MinAgeOffsetSearch("indexer", MIN_AGE_DAYS);

        IndexerSearchResult firstPage = indexer.page(0);
        testee.pageLoaded(firstPage);

        assertThat(testee.isSearchingFirstOldEnough()).isFalse();
        assertThat(testee.getNextOffset(firstPage)).isEqualTo(PAGE_SIZE);
    }

    @Test
    void shouldNotBisectWhenTotalResultsUnknown() {
        FakeIndexer indexer = FakeIndexer.withBoundaryAt(1000, 500);
        MinAgeOffsetSearch testee = new MinAgeOffsetSearch("indexer", MIN_AGE_DAYS);

        IndexerSearchResult firstPage = indexer.page(0);
        firstPage.setTotalResultsKnown(false);
        testee.pageLoaded(firstPage);

        assertThat(testee.isSearchingFirstOldEnough()).isFalse();
        assertThat(testee.getNextOffset(firstPage)).isEqualTo(PAGE_SIZE);
    }

    @Test
    void shouldNotBisectWhenFirstPageIsTheOnlyOne() {
        FakeIndexer indexer = FakeIndexer.withBoundaryAt(80, 80);
        MinAgeOffsetSearch testee = new MinAgeOffsetSearch("indexer", MIN_AGE_DAYS);

        IndexerSearchResult firstPage = indexer.page(0);
        testee.pageLoaded(firstPage);

        assertThat(testee.isSearchingFirstOldEnough()).isFalse();
        assertThat(testee.isMoreResultsAvailable(firstPage)).isFalse();
    }

    @Test
    void shouldNotBisectWhenFirstPageHasNoDates() {
        FakeIndexer indexer = FakeIndexer.withBoundaryAt(1000, 500);
        MinAgeOffsetSearch testee = new MinAgeOffsetSearch("indexer", MIN_AGE_DAYS);

        IndexerSearchResult firstPage = indexer.page(0);
        firstPage.setOldestResultDate(null);
        firstPage.setNewestResultDate(null);
        testee.pageLoaded(firstPage);

        assertThat(testee.isSearchingFirstOldEnough()).isFalse();
    }

    @Test
    void shouldStartBisectingWhenWholeFirstPageIsTooYoung() {
        FakeIndexer indexer = FakeIndexer.withBoundaryAt(1000, 500);
        MinAgeOffsetSearch testee = new MinAgeOffsetSearch("indexer", MIN_AGE_DAYS);

        IndexerSearchResult firstPage = indexer.page(0);
        assertThat(testee.pageLoaded(firstPage)).isTrue();

        assertThat(testee.isSearchingFirstOldEnough()).isTrue();
        assertThat(testee.isMoreResultsAvailable(firstPage)).isTrue();
        //Middle between 100 and 1000
        assertThat(testee.getNextOffset(firstPage)).isEqualTo(550);
    }

    @ParameterizedTest
    @ValueSource(ints = {100, 101, 199, 200, 437, 500, 899, 900, 950, 999})
    void shouldFindEveryOldEnoughResultExactlyOnceByBisecting(int boundary) {
        FakeIndexer indexer = FakeIndexer.withBoundaryAt(1000, boundary);
        MinAgeOffsetSearch testee = new MinAgeOffsetSearch("indexer", MIN_AGE_DAYS);

        List<Integer> keptOldEnough = run(testee, indexer);

        assertThat(keptOldEnough).containsExactlyElementsOf(range(boundary, 1000));
        //Bisecting 900 results in pages of 100 needs about log2(9) probes plus the contiguous page
        assertThat(testee.getProbes()).isBetween(1, 6);
        assertThat(testee.isSearchingFirstOldEnough()).isFalse();
    }

    @Test
    void shouldNeedFarFewerProbesThanPagesForLargeIndexer() {
        FakeIndexer indexer = FakeIndexer.withBoundaryAt(100_000, 73_456);
        MinAgeOffsetSearch testee = new MinAgeOffsetSearch("indexer", MIN_AGE_DAYS);

        List<Integer> keptOldEnough = run(testee, indexer);

        assertThat(keptOldEnough).containsExactlyElementsOf(range(73_456, 100_000));
        assertThat(testee.getProbes()).isLessThanOrEqualTo(15);
    }

    @Test
    void shouldLoadDirectlyWhenRangeIsNoLargerThanOnePage() {
        FakeIndexer indexer = FakeIndexer.withBoundaryAt(200, 200);
        MinAgeOffsetSearch testee = new MinAgeOffsetSearch("indexer", MIN_AGE_DAYS);

        IndexerSearchResult firstPage = indexer.page(0);
        testee.pageLoaded(firstPage);

        //Range 100 to 200 is exactly one page: load it instead of probing its middle
        assertThat(testee.getNextOffset(firstPage)).isEqualTo(100);
    }

    @Test
    void shouldProbeMiddleWhenRangeIsLargerThanOnePage() {
        FakeIndexer indexer = FakeIndexer.withBoundaryAt(201, 201);
        MinAgeOffsetSearch testee = new MinAgeOffsetSearch("indexer", MIN_AGE_DAYS);

        IndexerSearchResult firstPage = indexer.page(0);
        testee.pageLoaded(firstPage);

        assertThat(testee.getNextOffset(firstPage)).isEqualTo(150);
    }

    @Test
    void shouldStopWhenIndexerHasNothingOldEnough() {
        FakeIndexer indexer = FakeIndexer.withBoundaryAt(1000, 1000);
        MinAgeOffsetSearch testee = new MinAgeOffsetSearch("indexer", MIN_AGE_DAYS);

        List<Integer> keptOldEnough = run(testee, indexer);

        assertThat(keptOldEnough).isEmpty();
        assertThat(testee.isSearchingFirstOldEnough()).isFalse();
        assertThat(testee.getProbes()).isBetween(1, 6);
    }

    @Test
    void shouldHandleIndexerReportingMoreResultsThanItHas() {
        //Claims 1000 results but only has 650, the last 50 of which are old enough
        FakeIndexer indexer = FakeIndexer.withBoundaryAt(650, 600);
        indexer.reportedTotal = 1000;
        MinAgeOffsetSearch testee = new MinAgeOffsetSearch("indexer", MIN_AGE_DAYS);

        List<Integer> keptOldEnough = run(testee, indexer);

        assertThat(keptOldEnough).containsExactlyElementsOf(range(600, 650));
    }

    @Test
    void shouldStopWhenIndexerReportingMoreResultsThanItHasHasNothingOldEnough() {
        FakeIndexer indexer = FakeIndexer.withBoundaryAt(650, 650);
        indexer.reportedTotal = 1000;
        MinAgeOffsetSearch testee = new MinAgeOffsetSearch("indexer", MIN_AGE_DAYS);

        List<Integer> keptOldEnough = run(testee, indexer);

        assertThat(keptOldEnough).isEmpty();
        assertThat(testee.isSearchingFirstOldEnough()).isFalse();
    }

    @Test
    void shouldDiscardProbeBehindBoundary() {
        FakeIndexer indexer = FakeIndexer.withBoundaryAt(1000, 500);
        MinAgeOffsetSearch testee = new MinAgeOffsetSearch("indexer", MIN_AGE_DAYS);
        testee.pageLoaded(indexer.page(0));

        //Offset 550 is old enough completely, but the results between 500 and 550 haven't been loaded yet
        IndexerSearchResult probe = indexer.page(550);
        assertThat(testee.pageLoaded(probe)).isFalse();
        assertThat(testee.isSearchingFirstOldEnough()).isTrue();
    }

    @Test
    void shouldKeepProbeContainingBoundary() {
        FakeIndexer indexer = FakeIndexer.withBoundaryAt(1000, 600);
        MinAgeOffsetSearch testee = new MinAgeOffsetSearch("indexer", MIN_AGE_DAYS);
        testee.pageLoaded(indexer.page(0));

        IndexerSearchResult probe = indexer.page(550);
        assertThat(testee.pageLoaded(probe)).isTrue();
        assertThat(testee.isSearchingFirstOldEnough()).isFalse();
        assertThat(testee.getNextOffset(probe)).isEqualTo(650);
    }

    @Test
    void shouldResumeAfterLastTooYoungPageWhenIndexerDoesNotSortNewestFirst() {
        //Sorted newest first on the first page but not later: the probe in the middle is newer than the first page
        FakeIndexer indexer = FakeIndexer.withBoundaryAt(1000, 500);
        for (int i = 500; i < 1000; i++) {
            indexer.ageHours[i] = 1;
        }
        for (int i = 900; i < 1000; i++) {
            indexer.ageHours[i] = (MIN_AGE_DAYS + 10) * 24;
        }
        MinAgeOffsetSearch testee = new MinAgeOffsetSearch("indexer", MIN_AGE_DAYS);
        IndexerSearchResult firstPage = indexer.page(0);
        testee.pageLoaded(firstPage);
        assertThat(testee.getNextOffset(firstPage)).isEqualTo(550);

        IndexerSearchResult probe = indexer.page(550);
        assertThat(testee.pageLoaded(probe)).isFalse();
        assertThat(testee.isSearchingFirstOldEnough()).isTrue();
        assertThat(testee.getNextOffset(probe)).isEqualTo(100);

        IndexerSearchResult resumed = indexer.page(100);
        assertThat(testee.pageLoaded(resumed)).isTrue();
        assertThat(testee.isSearchingFirstOldEnough()).isFalse();
        assertThat(testee.getNextOffset(resumed)).isEqualTo(200);
    }

    @Test
    void shouldFindEveryOldEnoughResultWhenIndexerDoesNotSortNewestFirst() {
        FakeIndexer indexer = FakeIndexer.withBoundaryAt(1000, 500);
        for (int i = 500; i < 1000; i++) {
            indexer.ageHours[i] = 1;
        }
        for (int i = 900; i < 1000; i++) {
            indexer.ageHours[i] = (MIN_AGE_DAYS + 10) * 24;
        }
        MinAgeOffsetSearch testee = new MinAgeOffsetSearch("indexer", MIN_AGE_DAYS);

        List<Integer> keptOldEnough = run(testee, indexer);

        assertThat(keptOldEnough).containsExactlyElementsOf(range(900, 1000));
    }

    @Test
    void shouldContinueDirectlyWhenUnsortedProbeIsContiguous() {
        FakeIndexer indexer = FakeIndexer.withBoundaryAt(200, 200);
        //Page 100 to 200 is newer than the first page
        for (int i = 100; i < 200; i++) {
            indexer.ageHours[i] = 24;
        }
        MinAgeOffsetSearch testee = new MinAgeOffsetSearch("indexer", MIN_AGE_DAYS);
        testee.pageLoaded(indexer.page(0));

        IndexerSearchResult probe = indexer.page(100);
        assertThat(testee.pageLoaded(probe)).isTrue();
        assertThat(testee.isSearchingFirstOldEnough()).isFalse();
        assertThat(testee.getNextOffset(probe)).isEqualTo(200);
    }

    @Test
    void shouldResumeWhenProbeIsNotSortedWithinItself() {
        FakeIndexer indexer = FakeIndexer.withBoundaryAt(1000, 500);
        MinAgeOffsetSearch testee = new MinAgeOffsetSearch("indexer", MIN_AGE_DAYS);
        testee.pageLoaded(indexer.page(0));

        IndexerSearchResult probe = indexer.page(550);
        probe.setSortedNewestFirst(false);
        assertThat(testee.pageLoaded(probe)).isFalse();
        assertThat(testee.getNextOffset(probe)).isEqualTo(100);
    }

    @Test
    void shouldContinuePageByPageAfterFailedProbe() {
        FakeIndexer indexer = FakeIndexer.withBoundaryAt(1000, 500);
        MinAgeOffsetSearch testee = new MinAgeOffsetSearch("indexer", MIN_AGE_DAYS);
        testee.pageLoaded(indexer.page(0));

        IndexerSearchResult failed = new IndexerSearchResult(null, "Connection refused");
        failed.setOffset(550);
        assertThat(testee.pageLoaded(failed)).isTrue();

        assertThat(testee.isSearchingFirstOldEnough()).isFalse();
        assertThat(testee.isMoreResultsAvailable(failed)).isFalse();
    }

    @Test
    void shouldNotBisectWhenFirstPageFailed() {
        MinAgeOffsetSearch testee = new MinAgeOffsetSearch("indexer", MIN_AGE_DAYS);

        IndexerSearchResult failed = new IndexerSearchResult(null, "Connection refused");
        assertThat(testee.pageLoaded(failed)).isTrue();

        assertThat(testee.isSearchingFirstOldEnough()).isFalse();
        assertThat(testee.isMoreResultsAvailable(failed)).isFalse();
    }

    /**
     * Drives the search the way {@link IndexerSearchCacheEntry} does until the indexer has no more results or the search
     * is stalled and returns the indexes of the old enough results of all pages which were kept, in the order they were
     * loaded.
     */
    private static List<Integer> run(MinAgeOffsetSearch testee, FakeIndexer indexer) {
        List<Integer> keptOldEnough = new ArrayList<>();
        int offset = 0;
        for (int i = 0; i < 2000; i++) {
            IndexerSearchResult page = indexer.page(offset);
            if (testee.pageLoaded(page)) {
                for (int index = offset; index < offset + page.getPageSize(); index++) {
                    if (indexer.isOldEnough(index)) {
                        keptOldEnough.add(index);
                    }
                }
            }
            if (!testee.isMoreResultsAvailable(page)) {
                return keptOldEnough;
            }
            int nextOffset = testee.getNextOffset(page);
            assertThat(nextOffset).as("Next offset after %d", offset).isGreaterThanOrEqualTo(0);
            if (nextOffset == offset) {
                //IndexerSearchCacheEntry.isStalled() stops loading here. That must not happen before the first result old enough was found
                assertThat(testee.isSearchingFirstOldEnough()).as("Stalled at offset %d while searching", offset).isFalse();
                return keptOldEnough;
            }
            offset = nextOffset;
        }
        throw new AssertionError("Search didn't end");
    }

    private static List<Integer> range(int startInclusive, int endExclusive) {
        return IntStream.range(startInclusive, endExclusive).boxed().toList();
    }

    /**
     * An indexer which returns its results in pages of {@link #PAGE_SIZE}. The result at index i is i hours old
     * unless the age is changed, so it returns its results newest first. Results from the boundary on are older than
     * the minimum age.
     */
    private static class FakeIndexer {
        private final Instant now = Instant.now();
        private final int[] ageHours;
        private int reportedTotal;

        private FakeIndexer(int total) {
            ageHours = new int[total];
            reportedTotal = total;
        }

        static FakeIndexer withBoundaryAt(int total, int boundary) {
            FakeIndexer indexer = new FakeIndexer(total);
            //Young results are spread over the first 10 days, old ones start half a day after the minimum age
            for (int i = 0; i < total; i++) {
                if (i < boundary) {
                    indexer.ageHours[i] = (int) ((long) i * 10 * 24 / Math.max(boundary, 1));
                } else {
                    indexer.ageHours[i] = MIN_AGE_DAYS * 24 + 12 + (i - boundary);
                }
            }
            return indexer;
        }

        boolean isOldEnough(int index) {
            return ageHours[index] >= MIN_AGE_DAYS * 24;
        }

        IndexerSearchResult page(int offset) {
            List<SearchResultItem> items = new ArrayList<>();
            for (int i = offset; i < Math.min(offset + PAGE_SIZE, ageHours.length); i++) {
                SearchResultItem item = new SearchResultItem();
                item.setPubDate(now.minus(Duration.ofHours(ageHours[i])));
                items.add(item);
            }
            IndexerSearchResult page = new IndexerSearchResult(null, true);
            page.setOffset(offset);
            page.setPageSize(items.size());
            page.setTotalResults(reportedTotal);
            page.setTotalResultsKnown(true);
            page.setHasMoreResults(offset + items.size() < reportedTotal);
            page.rememberResultDates(items);
            return page;
        }
    }
}
