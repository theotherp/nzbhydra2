package org.nzbhydra.web.searching.mapping;

import lombok.Data;

import java.util.List;

@Data
public class SearchResponse {

    private List<IndexerSearch> indexersearches;
    private List<List<Object>> rejected;
    private List<SearchResult> results;


}
