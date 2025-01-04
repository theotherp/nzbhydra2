package org.nzbhydra.indexers;

import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.indexers.exceptions.IndexerSearchAbortedException;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlResponse;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.nzbhydra.mapping.newznab.xml.Xml;
import org.nzbhydra.searching.SearchResultAcceptor.AcceptorResult;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Scope;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component("wtfnzb")
@Scope("prototype")
public class WtfNzb extends Newznab {

    private static final Logger logger = LoggerFactory.getLogger(WtfNzb.class);


    @Override
    public IndexerSearchResult search(SearchRequest searchRequest, int offset, Integer limit) {
        if (searchRequest.getQuery().isEmpty() && searchRequest.getIdentifiers().isEmpty()) {
            return new IndexerSearchResult(this, "Search without query and query generation not supported");
        }
        return super.search(searchRequest, offset, limit);
    }

    @Override
    protected UriComponentsBuilder buildSearchUrl(SearchRequest searchRequest, Integer offset, Integer limit) throws IndexerSearchAbortedException {

        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(config.getHost()).path("/api_fast");
        String query = generateQueryIfApplicable(searchRequest, searchRequest.getQuery().get());
        builder.queryParam("q", query)
                .queryParam("apikey", config.getApiKey())
                .queryParam("r", config.getApiKey())
                .queryParam("i", config.getUsername())
        ;
        return builder;
    }

    protected void completeIndexerSearchResult(Xml response, IndexerSearchResult indexerSearchResult, AcceptorResult acceptorResult, SearchRequest searchRequest, int offset, Integer limit) {
        NewznabXmlResponse newznabResponse = ((NewznabXmlRoot) response).getRssChannel().getNewznabResponse();
        super.completeIndexerSearchResult(response, indexerSearchResult, acceptorResult, searchRequest, offset, limit);

        indexerSearchResult.setTotalResultsKnown(true);
        if (newznabResponse != null) {
            //Doesn't seem to support paging. No idea how big the page size is
            indexerSearchResult.setTotalResultsKnown(true);
            indexerSearchResult.setHasMoreResults(false);
            indexerSearchResult.setTotalResults(newznabResponse.getTotal());
            indexerSearchResult.setPageSize(newznabResponse.getTotal());
        } else {
            indexerSearchResult.setTotalResults(0);
            indexerSearchResult.setHasMoreResults(false);
            indexerSearchResult.setOffset(0);
            indexerSearchResult.setPageSize(0);
        }
    }

    @Override
    protected boolean isSwitchToTSearchNeeded(SearchRequest request) {
        return true;
    }


    @Component
    @Order(100)
    public static class NewznabHandlingStrategy implements IndexerHandlingStrategy<WtfNzb> {

        @Override
        public boolean handlesIndexerConfig(IndexerConfig config) {
            boolean isIndexerWtfNzb = config != null && config.getSearchModuleType() == SearchModuleType.WTFNZB;
            if (isIndexerWtfNzb) {
                logger.debug("Will use special WtfNzb limit handling for indexer with host {}", config.getHost());
            }
            return isIndexerWtfNzb;
        }

        @Override
        public String getName() {
            return "WTFNZB";
        }


    }

}
