package org.nzbhydra.indexers;

import org.nzbhydra.indexers.exceptions.IndexerSearchAbortedException;
import org.nzbhydra.searching.IndexerSearchResult;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;

public class NzbIndex extends Indexer {
    @Override
    protected IndexerSearchResult searchInternal(SearchRequest searchRequest, int offset, Integer limit) throws IndexerSearchAbortedException {
        return null;
    }

    @Override
    public NfoResult getNfo(String guid) {
        return null;
    }

    @Override
    protected Logger getLogger() {
        return null;
    }
}
