package org.nzbhydra.searching;

import lombok.Data;

import java.util.TreeSet;

@Data
public class SearchResult {

    private DuplicateDetector.DuplicateDetectionResult duplicateDetectionResult;
    //private List<IndexerSearchInfo> indexerSearchInfos = new ArrayList<>();

    public int calculateNumberOfResults() {
        if (duplicateDetectionResult == null) {
            return 0;
        }
//        int count = 0;
//        for (TreeSet<SearchResultItem> i : duplicateDetectionResult.getDuplicateGroups()) {
//            count += i.size();
//        }
//        return count;

        return duplicateDetectionResult.getDuplicateGroups().stream().mapToInt(TreeSet::size).sum();
    }
}
