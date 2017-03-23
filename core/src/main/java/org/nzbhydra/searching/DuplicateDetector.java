package org.nzbhydra.searching;

import com.google.common.base.Stopwatch;
import org.nzbhydra.searching.searchmodules.AbstractIndexer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import static com.google.common.collect.Lists.newArrayList;

@Component
public class DuplicateDetector {

    private static final Logger logger = LoggerFactory.getLogger(DuplicateDetector.class);


    public DuplicateDetectionResult detectDuplicates(List<SearchResultItem> results) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        Map<String, List<SearchResultItem>> groupedByTitle = results.stream().collect(Collectors.groupingBy(x -> x.getTitle().replaceFirst("[ .\\-_]", "")));

        List<TreeSet<SearchResultItem>> duplicateGroups = new ArrayList<>();

        //In each list of searchResults with the same title we want to find the duplicates
        int countDetectedDuplicates = 0;
        for (List<SearchResultItem> titleGroup : groupedByTitle.values()) {
            //TODO We can do that in parallel for every title group, but performance doesn't seem to be an issue
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
                    listOfBuckets.add(new TreeSet<>(newArrayList(searchResultItem)));
                }
            }
            duplicateGroups.addAll(listOfBuckets);
        }
        Map<AbstractIndexer, Integer> uniqueResultsPerIndexer = new HashMap<>();
        for (SearchResultItem result : duplicateGroups.stream().filter(x -> x.size() == 1).map(x -> x.iterator().next()).collect(Collectors.toList())) {
            int count = 0;
            if (uniqueResultsPerIndexer.containsKey(result.getIndexer())) {
                count = uniqueResultsPerIndexer.get(result.getIndexer());
            }
            uniqueResultsPerIndexer.put(result.getIndexer(), count);
        }

        logger.info("Duplicate detection for {} searchResults took {}ms. Found {} duplicates", results.size(), stopwatch.elapsed(TimeUnit.MILLISECONDS), countDetectedDuplicates);

        return new DuplicateDetectionResult(duplicateGroups, uniqueResultsPerIndexer);
    }

    private boolean testForSameness(SearchResultItem result1, SearchResultItem result2) {
        if (result1.getIndexer().equals(result2.getIndexer())) {
            return false;
        }

        boolean groupKnown = result1.getGroup() != null && result2.getGroup() != null;
        boolean sameGroup = Objects.equals(result1.getGroup(), result2.getGroup());
        boolean posterKnown = result1.getPoster() != null && result2.getPoster() != null;
        boolean samePoster = Objects.equals(result1.getPoster(), result2.getPoster());

        float duplicateAgeThresthold = 0.1f;
        float duplicateSizeThreshold = 0.1f;

        if ((groupKnown && !sameGroup) || (posterKnown && !samePoster)) {
            return false;
        }

        if ((sameGroup && !posterKnown) || (samePoster && !groupKnown)) {
            duplicateAgeThresthold *= 2;
            duplicateSizeThreshold *= 2;
        }

        return testForDuplicateAge(result1, result2, duplicateAgeThresthold) && testForDuplicateSize(result1, result2, duplicateSizeThreshold);
    }

    private boolean testForDuplicateAge(SearchResultItem result1, SearchResultItem result2, float duplicateAgeThreshold) {
        if (result1.getPubDate() == null || result2.getPubDate() == null) {
            return false;
        }
        return Math.abs(result1.getPubDate().getEpochSecond() - result2.getPubDate().getEpochSecond()) / (60*60) <= duplicateAgeThreshold;
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
