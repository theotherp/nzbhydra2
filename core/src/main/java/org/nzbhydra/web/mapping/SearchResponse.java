package org.nzbhydra.web.mapping;

import lombok.Data;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Data
public class SearchResponse {

    private List<IndexerSearchMetaData> indexerSearchMetaDatas = new ArrayList<>();
    private Map<String, Integer> rejectedReasonsMap = new HashMap<>();
    private Map<String, String> notPickedIndexersWithReason;
    private int numberOfRejectedResults;
    private List<SearchResult> searchResults = new ArrayList<>();
    private int numberOfAvailableResults;
    private int numberOfResults;
    private int offset;
    private int limit;



}
