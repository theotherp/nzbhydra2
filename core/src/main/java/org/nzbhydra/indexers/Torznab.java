package org.nzbhydra.indexers;

import lombok.Getter;
import lombok.Setter;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.config.SearchModuleType;
import org.nzbhydra.mapping.newznab.xml.*;
import org.nzbhydra.searching.IndexerSearchResult;
import org.nzbhydra.searching.SearchResultAcceptor.AcceptorResult;
import org.nzbhydra.searching.SearchResultIdCalculator;
import org.nzbhydra.searching.SearchResultItem;
import org.nzbhydra.searching.SearchResultItem.DownloadType;
import org.nzbhydra.searching.SearchResultItem.HasNfo;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.Collections;

@Getter
@Setter
@Component
public class Torznab extends Newznab {

    private static final Logger logger = LoggerFactory.getLogger(Torznab.class);

    protected SearchResultItem createSearchResultItem(NewznabXmlItem item) {
        item.getRssGuid().setPermaLink(true); //Not set in RSS but actually always true
        SearchResultItem searchResultItem = super.createSearchResultItem(item);
        if (item.getCategory() != null) {
            computeCategory(searchResultItem, Collections.singletonList(Integer.valueOf(item.getCategory())));
        } else {
            searchResultItem.setCategory(categoryProvider.getNotAvailable());
        }

        searchResultItem.setGrabs(item.getGrabs());
        searchResultItem.setIndexerGuid(item.getRssGuid().getGuid());
        for (NewznabAttribute attribute : item.getTorznabAttributes()) {
            searchResultItem.getAttributes().put(attribute.getName(), attribute.getValue());
            switch (attribute.getName()) {
                case "grabs":
                    searchResultItem.setGrabs(Integer.valueOf(attribute.getValue()));
                    break;
                case "guid":
                    searchResultItem.setIndexerGuid(attribute.getValue());
                    break;
                case "seeders":
                    searchResultItem.setSeeders(Integer.valueOf(attribute.getValue()));
                    break;
                case "peers":
                    searchResultItem.setPeers(Integer.valueOf(attribute.getValue()));
                    break;
            }
        }
        searchResultItem.setHasNfo(HasNfo.NO);
        searchResultItem.setIndexerScore(config.getScore().orElse(0));
        searchResultItem.setDownloadType(DownloadType.TORRENT);
        searchResultItem.setGuid(SearchResultIdCalculator.calculateSearchResultId(searchResultItem));
        return searchResultItem;
    }

    @Override
    protected String addForbiddenWords(SearchRequest searchRequest, String query) {
        return query; //Jackett etc don't support excluding words using the query
    }

    @Override
    protected void completeIndexerSearchResult(Xml response, IndexerSearchResult indexerSearchResult, AcceptorResult acceptorResult, SearchRequest searchRequest) {
        NewznabXmlChannel rssChannel = ((NewznabXmlRoot) response).getRssChannel();
        super.completeIndexerSearchResult(response, indexerSearchResult, acceptorResult, searchRequest);
        indexerSearchResult.setTotalResultsKnown(true);
        indexerSearchResult.setHasMoreResults(false);
        indexerSearchResult.setOffset(0);
        indexerSearchResult.setTotalResults(rssChannel.getItems().size());
        indexerSearchResult.setLimit(searchRequest.getLimit().orElse(100));
    }

    protected Logger getLogger() {
        return logger;
    }

    @Component
    @Order(2000)
    public static class NewznabHandlingStrategy implements IndexerHandlingStrategy {

        @Override
        public boolean handlesIndexerConfig(IndexerConfig config) {
            return config.getSearchModuleType() == SearchModuleType.TORZNAB;
        }

        @Override
        public Class<? extends Indexer> getIndexerClass() {
            return Torznab.class;
        }
    }


}
