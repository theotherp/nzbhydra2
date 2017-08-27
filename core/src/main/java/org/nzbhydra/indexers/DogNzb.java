package org.nzbhydra.indexers;

import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.config.SearchModuleType;
import org.nzbhydra.mapping.newznab.NewznabResponse;
import org.nzbhydra.mapping.newznab.RssRoot;
import org.nzbhydra.mapping.newznab.Xml;
import org.nzbhydra.searching.IndexerSearchResult;
import org.nzbhydra.searching.ResultAcceptor.AcceptorResult;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
public class DogNzb extends Newznab {

    protected void completeIndexerSearchResult(Xml response, IndexerSearchResult indexerSearchResult, AcceptorResult acceptorResult, SearchRequest searchRequest) {
        NewznabResponse newznabResponse = ((RssRoot) response).getRssChannel().getNewznabResponse();

        //DogNZB does not return a reliable total number. It's always 100 if there are more results, less if it's the last page
        indexerSearchResult.setTotalResultsKnown(false);
        if (newznabResponse != null) {
            if (newznabResponse.getTotal() == 100) {
                indexerSearchResult.setHasMoreResults(true);
                indexerSearchResult.setTotalResults(100);
            } else {
                indexerSearchResult.setTotalResultsKnown(true);
                indexerSearchResult.setHasMoreResults(false);
                indexerSearchResult.setTotalResults(searchRequest.getOffset().orElse(0) + newznabResponse.getTotal());
            }
            indexerSearchResult.setOffset(newznabResponse.getOffset());
            indexerSearchResult.setLimit(100);
        } else {
            indexerSearchResult.setTotalResults(0);
            indexerSearchResult.setHasMoreResults(false);
            indexerSearchResult.setOffset(0);
            indexerSearchResult.setLimit(0);
        }
    }


    @Component
    @Order(100)
    public static class NewznabHandlingStrategy implements IndexerHandlingStrategy {

        @Override
        public boolean handlesIndexerConfig(IndexerConfig config) {
            return config != null && config.getSearchModuleType() == SearchModuleType.NEWZNAB && config.getHost().toLowerCase().contains("dognzb");
        }

        @Override
        public Class<? extends Indexer> getIndexerClass() {
            return DogNzb.class;
        }
    }

}
