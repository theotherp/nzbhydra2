package org.nzbhydra.searching.searchmodules;

import org.nzbhydra.searching.IndexerSearchResult;
import org.nzbhydra.searching.searchrequests.SearchRequest;

public interface Indexer {

    IndexerSearchResult search(SearchRequest searchRequest, int offset, int limit);

    String getName();
}
