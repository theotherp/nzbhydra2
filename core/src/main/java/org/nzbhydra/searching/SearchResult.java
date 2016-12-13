package org.nzbhydra.searching;

import lombok.Data;

@Data
public class SearchResult {

    private DuplicateDetector.DuplicateDetectionResult duplicateDetectionResult;
    //private List<IndexerSearchInfo> indexerSearchInfos = new ArrayList<>();
}
