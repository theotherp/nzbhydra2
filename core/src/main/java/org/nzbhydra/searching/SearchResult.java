package org.nzbhydra.searching;

import lombok.Data;
import org.nzbhydra.searching.searchmodules.Indexer;

import java.util.*;

@Data
public class SearchResult {


    private DuplicateDetectionResult duplicateDetectionResult;
    private Map<Indexer, List<IndexerSearchResult>> indexerSearchResultMap = new HashMap<>();

    public SearchResult() {
        duplicateDetectionResult = new DuplicateDetectionResult(new ArrayList<>(), new HashMap<>());
    }

    public int calculateNumberOfResults() {
        if (duplicateDetectionResult == null) {
            return 0;
        }

        return duplicateDetectionResult.getDuplicateGroups().stream().mapToInt(TreeSet::size).sum();
    }
}
