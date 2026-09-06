package org.nzbhydra.searching;

import com.google.common.collect.HashMultiset;
import com.google.common.collect.Iterables;
import com.google.common.collect.Multiset;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.searching.DuplicateGroups.DuplicateGroup;
import org.nzbhydra.searching.dtoseventsenums.DuplicateDetectionResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

import static com.google.common.collect.Lists.newArrayList;

@Component
public class DuplicateDetector {

    private static final Logger logger = LoggerFactory.getLogger(DuplicateDetector.class);

    @Autowired
    protected ConfigProvider configProvider;

    /**
     * Matches the given new items against the groups found so far and either adds them to a matching group or creates
     * a new one for them. Items are processed newest first so that a single batch of new items is grouped in the same
     * way as by {@link #detectDuplicates(Set)}. Over several rounds the grouping is a greedy heuristic just like the
     * batch one: a new item is compared with all members of the existing groups, including older ones, so in rare
     * fuzzy cases (sameness is not transitive) the result may differ from grouping all items at once.
     */
    public void addToGroups(DuplicateGroups duplicateGroups, Collection<SearchResultItem> newItems) {
        List<SearchResultItem> newestFirst = newItems.stream().sorted(SearchResultItem.NEWEST_FIRST).toList();
        int countDetectedDuplicates = 0;
        for (SearchResultItem searchResultItem : newestFirst) {
            if (duplicateGroups.getGroup(searchResultItem) != null) {
                //Was already grouped in a previous round
                continue;
            }
            DuplicateGroup matchingGroup = null;
            for (DuplicateGroup group : duplicateGroups.getGroupsWithSameTitle(searchResultItem)) {
                if (isSameAsAnyItemInBucket(searchResultItem, group.getItems())) {
                    matchingGroup = group;
                    break;
                }
            }
            if (matchingGroup == null) {
                duplicateGroups.createGroup(searchResultItem);
            } else {
                duplicateGroups.addToGroup(matchingGroup, searchResultItem);
                countDetectedDuplicates++;
            }
        }
        logger.debug("Duplicate detection for {} new search results found {} duplicates", newItems.size(), countDetectedDuplicates);
    }

    public DuplicateDetectionResult detectDuplicates(Set<SearchResultItem> results) {
        Map<String, List<SearchResultItem>> groupedByTitle = results.stream().collect(Collectors.groupingBy(x -> DuplicateGroups.normalizeTitle(x.getTitle())));
        Multiset<Indexer> countUniqueResultsPerIndexer = HashMultiset.create();
        List<LinkedHashSet<SearchResultItem>> duplicateGroups = new ArrayList<>();

        //In each list of searchResults with the same title we want to find the duplicates
        int countDetectedDuplicates = 0;
        for (List<SearchResultItem> titleGroup : groupedByTitle.values()) {
            titleGroup = titleGroup.stream().sorted(Comparator.comparing(SearchResultItem::getBestDate).reversed()).collect(Collectors.toList());
            //So we start with a bucket with the first (later we have a list of buckets where all searchResults in a bucket are duplicates)
            List<LinkedHashSet<SearchResultItem>> listOfBuckets = new ArrayList<>();
            listOfBuckets.add(new LinkedHashSet<>(newArrayList(titleGroup.get(0))));
            //And iterate over every other item in the list
            for (int i = 1; i < titleGroup.size(); i++) {
                SearchResultItem searchResultItem = titleGroup.get(i);
                boolean foundBucket = false;
                //Iterate over already existing buckets
                for (LinkedHashSet<SearchResultItem> bucket : listOfBuckets) {
                    //And all searchResults in those buckets
                    if (isSameAsAnyItemInBucket(searchResultItem, bucket)) {
                        //If they are the same we found a bucket for the result. We add it and continue
                        foundBucket = true;
                        bucket.add(searchResultItem);
                        countDetectedDuplicates++;
                        break;
                    }
                }
                //If we didn't find a bucket for the result we start a new one
                if (!foundBucket) {
                    listOfBuckets.add(new LinkedHashSet<>(newArrayList(searchResultItem)));
                }
            }
            LinkedHashSet<SearchResultItem> lastBucket = Iterables.getLast(listOfBuckets);
            if (lastBucket.size() == 1) {
                countUniqueResultsPerIndexer.add(lastBucket.iterator().next().getIndexer());
            }
            duplicateGroups.addAll(listOfBuckets);
        }
        int duplicateIdentifier = 0;
        for (LinkedHashSet<SearchResultItem> group : duplicateGroups) {
            for (SearchResultItem x : group) {
                x.setDuplicateIdentifier(duplicateIdentifier);
            }
            duplicateIdentifier++;
        }

        logger.debug("Duplicate detection for {} search results found {} duplicates", results.size(), countDetectedDuplicates);

        return new DuplicateDetectionResult(duplicateGroups, countUniqueResultsPerIndexer, countDetectedDuplicates);
    }

    /**
     * Returns true if the item is a duplicate of any of the bucket's items. A bucket which already contains an item
     * of the same indexer can never match.
     */
    private boolean isSameAsAnyItemInBucket(SearchResultItem searchResultItem, Collection<SearchResultItem> bucket) {
        if (bucket.stream().map(SearchResultItem::getIndexer).toList().contains(searchResultItem.getIndexer())) {
            return false;
        }
        for (SearchResultItem other : bucket) {
            if (testForSameness(searchResultItem, other)) {
                return true;
            }
        }
        return false;
    }

    private boolean testForSameness(SearchResultItem result1, SearchResultItem result2) {
        logger.debug(LoggingMarkers.DUPLICATES, "Comparing {} and {}", result1, result2);
        if (result1.getIndexer().equals(result2.getIndexer())) {
            logger.debug(LoggingMarkers.DUPLICATES, "Same indexer");
            return false;
        }

        if (result1.getDownloadType() == DownloadType.TORRENT || result2.getDownloadType() == DownloadType.TORRENT) {
            logger.debug(LoggingMarkers.DUPLICATES, "Torrent download type(s). Type 1: {}. Type 2: {}", result1.getDownloadType(), result2.getDownloadType());
            return false;
        }

        boolean groupKnown = result1.getGroup().isPresent() && result2.getGroup().isPresent();
        boolean sameGroup = groupKnown && Objects.equals(result1.getGroup().get(), result2.getGroup().get());
        boolean posterKnown = result1.getPoster().isPresent() && result2.getPoster().isPresent();
        boolean samePoster = posterKnown && Objects.equals(result1.getPoster().get(), result2.getPoster().get());

        float duplicateAgeThreshold = configProvider.getBaseConfig().getSearching().getDuplicateAgeThreshold();
        float duplicateSizeThreshold = configProvider.getBaseConfig().getSearching().getDuplicateSizeThresholdInPercent();

        if (groupKnown && !sameGroup) {
            logger.debug(LoggingMarkers.DUPLICATES, "Not the same group: {} and {}", result1.getGroup().orElse(null), result2.getGroup().orElse(null));
            return false;
        }
        if (posterKnown && !samePoster) {
            logger.debug(LoggingMarkers.DUPLICATES, "Not the same poster: {} and {}", result1.getPoster().orElse(null), result2.getPoster().orElse(null));
            return false;
        }

        if ((sameGroup && !posterKnown) || (samePoster && !groupKnown)) {
            duplicateAgeThreshold *= 2;
            duplicateSizeThreshold *= 2;
        }

        return testForDuplicateAge(result1, result2, duplicateAgeThreshold) && testForDuplicateSize(result1, result2, duplicateSizeThreshold);
    }

    protected boolean testForDuplicateAge(SearchResultItem result1, SearchResultItem result2, float duplicateAgeThreshold) {
        Instant date1 = result1.getBestDate();
        Instant date2 = result2.getBestDate();
        if (date1 == null || date2 == null) {
            logger.debug(LoggingMarkers.DUPLICATES, "At least one result has no usenet date and no pub date");
            return false;
        }
        boolean isSameAge = Math.abs(date1.getEpochSecond() - date2.getEpochSecond()) / (60 * 60) <= duplicateAgeThreshold;
        logger.debug(LoggingMarkers.DUPLICATES, "Same age: {}", isSameAge);
        return isSameAge;
    }

    private boolean testForDuplicateSize(SearchResultItem result1, SearchResultItem result2, float duplicateSizeDifference) {
        if (result1.getSize() == null || result2.getSize() == null) {
            return false;
        }
        long sizeDifference = Math.abs(result1.getSize() - result2.getSize());
        float sizeAverage = (result1.getSize() + result2.getSize()) / 2F;
        float sizeDiffPercent = Math.abs(sizeDifference / sizeAverage) * 100;
        boolean sameSize = sizeDiffPercent <= duplicateSizeDifference;
        logger.debug(LoggingMarkers.DUPLICATES, "Same size: {}", sameSize);
        return sameSize;
    }


}
