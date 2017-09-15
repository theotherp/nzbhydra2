package org.nzbhydra.searching;

import com.google.common.base.Stopwatch;
import com.google.common.collect.HashMultiset;
import com.google.common.collect.Iterables;
import com.google.common.collect.Multiset;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.logging.LoggingMarkers;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeSet;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import static com.google.common.collect.Lists.newArrayList;

@Component
public class DuplicateDetector {

    private static final Logger logger = LoggerFactory.getLogger(DuplicateDetector.class);

    @Autowired
    private ConfigProvider configProvider;

    public DuplicateDetectionResult detectDuplicates(List<SearchResultItem> results) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        Map<String, List<SearchResultItem>> groupedByTitle = results.stream().collect(Collectors.groupingBy(x -> x.getTitle().replaceFirst("[ .\\-_]", "")));
        Multiset<Indexer> countUniqueResultsPerIndexer = HashMultiset.create();
        List<TreeSet<SearchResultItem>> duplicateGroups = new ArrayList<>();

        //In each list of searchResults with the same title we want to find the duplicates
        int countDetectedDuplicates = 0;
        int duplicateIdentifier = 1;
        for (List<SearchResultItem> titleGroup : groupedByTitle.values()) {
            titleGroup = titleGroup.stream().sorted(Comparator.comparing(SearchResultItem::getPubDate).reversed()).collect(Collectors.toList());
            //So we start with a bucket with the first (later we have a list of buckets where all searchResults in a bucket are duplicates)
            List<TreeSet<SearchResultItem>> listOfBuckets = new ArrayList<>();
            listOfBuckets.add(new TreeSet<>(newArrayList(titleGroup.get(0))));
            //And iterate over every other item in the list
            for (int i = 1; i < titleGroup.size(); i++) {
                SearchResultItem searchResultItem = titleGroup.get(i);
                boolean foundBucket = false;
                //Iterate over already existing buckets
                for (TreeSet<SearchResultItem> bucket : listOfBuckets) {
                    //And all searchResults in those buckets
                    for (SearchResultItem other : bucket) {
                        //Now we can check if the two searchResults are duplicates
                        boolean same = testForSameness(searchResultItem, other);
                        if (same) {
                            //If they are the same we found a bucket for the result. We add it and continue
                            foundBucket = true;
                            searchResultItem.setDuplicateIdentifier(duplicateIdentifier);
                            bucket.add(searchResultItem);
                            countDetectedDuplicates++;
                            break;
                        }
                    }
                    //If we already found a bucket for the result we can go on with the next
                    if (foundBucket) {
                        break;
                    }
                }
                //If we didn't find a bucket for the result we start a new one
                if (!foundBucket) {
                    searchResultItem.setDuplicateIdentifier(duplicateIdentifier++);
                    listOfBuckets.add(new TreeSet<>(newArrayList(searchResultItem)));
                }
            }
            TreeSet<SearchResultItem> lastBucket = Iterables.getLast(listOfBuckets);
            if (lastBucket.size() == 1) {
                countUniqueResultsPerIndexer.add(lastBucket.first().getIndexer());
            }
            duplicateGroups.addAll(listOfBuckets);
        }

//        for (SearchResultItem result : duplicateGroups.stream().filter(x -> x.size() == 1).map(x -> x.iterator().next()).collect(Collectors.toList())) {
//            int count = uniqueResultsPerIndexer.get(result.getIndexer());
//            uniqueResultsPerIndexer.put(result.getIndexer(), count);
//        }

        logger.debug(LoggingMarkers.PERFORMANCE, "Duplicate detection for {} search results took {}ms. Found {} duplicates", results.size(), stopwatch.elapsed(TimeUnit.MILLISECONDS), countDetectedDuplicates);

        return new DuplicateDetectionResult(duplicateGroups, countUniqueResultsPerIndexer);
    }

    private boolean testForSameness(SearchResultItem result1, SearchResultItem result2) {
        if (result1.getIndexer().equals(result2.getIndexer())) {
            return false;
        }

        boolean groupKnown = result1.getGroup().isPresent() && result2.getGroup().isPresent();
        boolean sameGroup = groupKnown && Objects.equals(result1.getGroup().get(), result2.getGroup().get());
        boolean posterKnown = result1.getPoster().isPresent() && result2.getPoster().isPresent();
        boolean samePoster = posterKnown && Objects.equals(result1.getPoster().get(), result2.getPoster().get());

        float duplicateAgeThreshold = configProvider.getBaseConfig().getSearching().getDuplicateAgeThreshold();
        float duplicateSizeThreshold = configProvider.getBaseConfig().getSearching().getDuplicateSizeThresholdInPercent();

        if ((groupKnown && !sameGroup) || (posterKnown && !samePoster)) {
            return false;
        }

        if ((sameGroup && !posterKnown) || (samePoster && !groupKnown)) {
            duplicateAgeThreshold *= 2;
            duplicateSizeThreshold *= 2;
        }

        return testForDuplicateAge(result1, result2, duplicateAgeThreshold) && testForDuplicateSize(result1, result2, duplicateSizeThreshold);
    }

    private boolean testForDuplicateAge(SearchResultItem result1, SearchResultItem result2, float duplicateAgeThreshold) {
        if (result1.getPubDate() == null || result2.getPubDate() == null) {
            return false;
        }
        return Math.abs(result1.getPubDate().getEpochSecond() - result2.getPubDate().getEpochSecond()) / (60 * 60) <= duplicateAgeThreshold;
    }

    private boolean testForDuplicateSize(SearchResultItem result1, SearchResultItem result2, float duplicateSizeDifference) {
        if (result1.getSize() == null || result2.getSize() == null) {
            return false;
        }
        long sizeDifference = Math.abs(result1.getSize() - result2.getSize());
        float sizeAverage = (result1.getSize() + result2.getSize()) / 2;
        float sizeDiffPercent = Math.abs(sizeDifference / sizeAverage) * 100;
        return sizeDiffPercent < duplicateSizeDifference;
    }


}
