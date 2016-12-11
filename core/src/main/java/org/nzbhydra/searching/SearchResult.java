package org.nzbhydra.searching;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class SearchResult {

    private List<SearchResultItem> searchResultItems = new ArrayList<>();
    private List<IndexerSearchInfo> indexerSearchInfos = new ArrayList<>();
}
