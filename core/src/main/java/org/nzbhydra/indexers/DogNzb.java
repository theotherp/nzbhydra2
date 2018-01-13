package org.nzbhydra.indexers;

import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.config.SearchModuleType;
import org.nzbhydra.mapping.newznab.NewznabResponse;
import org.nzbhydra.mapping.newznab.RssRoot;
import org.nzbhydra.mapping.newznab.Xml;
import org.nzbhydra.searching.IndexerSearchResult;
import org.nzbhydra.searching.SearchResultAcceptor.AcceptorResult;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
public class DogNzb extends Newznab {

    private static final Logger logger = LoggerFactory.getLogger(DogNzb.class);

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
            boolean isIndexerDogNzb = config != null && config.getSearchModuleType() == SearchModuleType.NEWZNAB && config.getHost().toLowerCase().contains("dognzb");
            if (isIndexerDogNzb) {
                logger.debug("Will use special DOgNZB limit handling for indexer with host {}", config.getHost());
            }
            return isIndexerDogNzb;
        }

        @Override
        public Class<? extends Indexer> getIndexerClass() {
            return DogNzb.class;
        }
    }

}
