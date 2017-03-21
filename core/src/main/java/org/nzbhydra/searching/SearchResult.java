package org.nzbhydra.searching;

import lombok.Data;

import java.util.Collections;
import java.util.TreeSet;

@Data
public class SearchResult {


    private DuplicateDetectionResult duplicateDetectionResult;

    public SearchResult() {
        duplicateDetectionResult = new DuplicateDetectionResult(Collections.emptyList(), Collections.emptyMap());
    }

    public int calculateNumberOfResults() {
        if (duplicateDetectionResult == null) {
            return 0;
        }

        return duplicateDetectionResult.getDuplicateGroups().stream().mapToInt(TreeSet::size).sum();
    }
}
