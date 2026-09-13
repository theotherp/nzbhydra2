package org.nzbhydra.searching;

import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.IdentityHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

/**
 * Holds the duplicate groups found for one search. Items are added incrementally, i.e. every time an indexer returned
 * a new page its items are matched against the groups built so far. This class contains no logic to decide if two
 * items are duplicates, that's up to {@link DuplicateDetector}.
 */
public class DuplicateGroups {

    private final List<DuplicateGroup> groups = new ArrayList<>();
    /**
     * Groups by the normalized title of their items. Only groups with the same normalized title can ever contain
     * duplicates, so this limits the number of groups which need to be compared.
     */
    private final Map<String, List<DuplicateGroup>> groupsByNormalizedTitle = new HashMap<>();
    private final Map<SearchResultItem, DuplicateGroup> groupByItem = new IdentityHashMap<>();
    private int numberOfDuplicates;
    private int nextIdentifier;

    /**
     * Normalizes a title so that items which only differ in separators are compared with each other.
     */
    public static String normalizeTitle(String title) {
        if (title == null) {
            return "";
        }
        return title.toLowerCase().replaceAll("[ .\\-_]", "");
    }

    public List<DuplicateGroup> getGroups() {
        return Collections.unmodifiableList(groups);
    }

    /**
     * Returns the groups which might contain duplicates of the given item, i.e. those with the same normalized title.
     */
    public List<DuplicateGroup> getGroupsWithSameTitle(SearchResultItem item) {
        return groupsByNormalizedTitle.getOrDefault(normalizeTitle(item.getTitle()), Collections.emptyList());
    }

    public DuplicateGroup getGroup(SearchResultItem item) {
        return groupByItem.get(item);
    }

    public int getNumberOfDuplicates() {
        return numberOfDuplicates;
    }

    /**
     * Creates a new group containing only the given item.
     */
    public DuplicateGroup createGroup(SearchResultItem item) {
        DuplicateGroup group = new DuplicateGroup(nextIdentifier++);
        groups.add(group);
        groupsByNormalizedTitle.computeIfAbsent(normalizeTitle(item.getTitle()), x -> new ArrayList<>()).add(group);
        addToGroup(group, item);
        return group;
    }

    /**
     * Adds the item to an existing group. Every item after the first one in a group is counted as a duplicate.
     */
    public void addToGroup(DuplicateGroup group, SearchResultItem item) {
        if (!group.getItems().isEmpty()) {
            numberOfDuplicates++;
        }
        group.getItems().add(item);
        groupByItem.put(item, group);
        item.setDuplicateIdentifier(group.getIdentifier());
    }

    /**
     * A number of search result items which are considered logically identical (different indexers, same usenet
     * posting).
     */
    public static class DuplicateGroup {

        private final int identifier;
        private final LinkedHashSet<SearchResultItem> items = new LinkedHashSet<>();
        /**
         * Set once one of the group's items was added to the merged result list of an API search.
         */
        private boolean represented;

        public DuplicateGroup(int identifier) {
            this.identifier = identifier;
        }

        public int getIdentifier() {
            return identifier;
        }

        public LinkedHashSet<SearchResultItem> getItems() {
            return items;
        }

        public boolean isRepresented() {
            return represented;
        }

        public void setRepresented(boolean represented) {
            this.represented = represented;
        }

    }

}
