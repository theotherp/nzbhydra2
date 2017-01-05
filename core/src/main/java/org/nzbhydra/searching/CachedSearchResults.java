package org.nzbhydra.searching;

import lombok.Data;
import org.nzbhydra.searching.searchmodules.Indexer;
import org.nzbhydra.searching.searchrequests.SearchRequest;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Data
public class CachedSearchResults {

    private SearchRequest searchRequest;
    private Map<Indexer, List<IndexerSearchResult>> indexerSearchProcessingDatas = new HashMap<>();

    public CachedSearchResults(SearchRequest searchRequest, List<Indexer> indexers) {
        this.searchRequest = searchRequest;
        for (Indexer indexer : indexers) {
            ArrayList<IndexerSearchResult> list = new ArrayList<>();
            list.add(new IndexerSearchResult(indexer));
            indexerSearchProcessingDatas.put(indexer, list);
        }
    }


}
