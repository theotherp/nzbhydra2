package org.nzbhydra.searching.searchmodules;

import org.nzbhydra.searching.IndexerSearchResult;
import org.nzbhydra.searching.searchrequests.SearchRequest;

public interface SearchModule {

    IndexerSearchResult search(SearchRequest searchRequest);
}
