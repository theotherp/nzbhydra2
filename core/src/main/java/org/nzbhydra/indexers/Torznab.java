package org.nzbhydra.indexers;

import lombok.Getter;
import lombok.Setter;
import org.nzbhydra.NzbHydraException;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.indexers.exceptions.IndexerSearchAbortedException;
import org.nzbhydra.mapping.newznab.xml.*;
import org.nzbhydra.searching.SearchResultAcceptor.AcceptorResult;
import org.nzbhydra.searching.SearchResultIdCalculator;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem.DownloadType;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem.HasNfo;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Getter
@Setter
@Component
public class Torznab extends Newznab {

    private static final Logger logger = LoggerFactory.getLogger(Torznab.class);

    protected SearchResultItem createSearchResultItem(NewznabXmlItem item) throws NzbHydraException {
        item.getRssGuid().setPermaLink(true); //Not set in RSS but actually always true
        SearchResultItem searchResultItem = super.createSearchResultItem(item);
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
        searchResultItem.setSize(item.getSize());
        if (item.getSize() != null && item.getTorznabAttributes().stream().noneMatch(x -> x.getName().equals("size"))) {
            searchResultItem.getAttributes().put("size", String.valueOf(item.getSize()));
        }
        List<Integer> foundCategories = tryAndGetCategoryAsNumber(item);
        if (!foundCategories.isEmpty()) {
            computeCategory(searchResultItem, foundCategories);
        } else {
            searchResultItem.setCategory(categoryProvider.getNotAvailable());
        }
        searchResultItem.setHasNfo(HasNfo.NO);
        searchResultItem.setIndexerScore(config.getScore().orElse(0));
        searchResultItem.setDownloadType(DownloadType.TORRENT);
        searchResultItem.setGuid(SearchResultIdCalculator.calculateSearchResultId(searchResultItem));
        return searchResultItem;
    }

    protected List<Integer> tryAndGetCategoryAsNumber(NewznabXmlItem item) {
        Set<Integer> foundCategories = new HashSet<>();
        if (item.getCategory() != null) {
            try {
                foundCategories.add(Integer.parseInt(item.getCategory()));
            } catch (NumberFormatException e) {
                //NOP
            }
        }

        foundCategories.addAll(item.getNewznabAttributes().stream().filter(x -> x.getName().equals("category")).map(x -> Integer.valueOf(x.getValue())).collect(Collectors.toList()));
        foundCategories.addAll(item.getTorznabAttributes().stream().filter(x -> x.getName().equals("category")).map(x -> Integer.valueOf(x.getValue())).collect(Collectors.toList()));
        return new ArrayList<>(foundCategories);
    }

    @Override
    protected String addForbiddenWords(SearchRequest searchRequest, String query) {
        return query; //Jackett etc don't support excluding words using the query
    }

    @Override
    protected void completeIndexerSearchResult(Xml response, IndexerSearchResult indexerSearchResult, AcceptorResult acceptorResult, SearchRequest searchRequest, int offset, Integer limit) {
        NewznabXmlChannel rssChannel = ((NewznabXmlRoot) response).getRssChannel();
        super.completeIndexerSearchResult(response, indexerSearchResult, acceptorResult, searchRequest, offset, limit);
        indexerSearchResult.setTotalResultsKnown(true);
        indexerSearchResult.setHasMoreResults(false);
        indexerSearchResult.setOffset(0);
        indexerSearchResult.setTotalResults(rssChannel.getItems().size());
        indexerSearchResult.setLimit(10000);
    }

    @Override
    protected UriComponentsBuilder buildSearchUrl(SearchRequest searchRequest, Integer offset, Integer limit) throws IndexerSearchAbortedException {
        //Jackett doesn't support or require paging, so we overwrite offset and limit
        return super.buildSearchUrl(searchRequest, null, null);
    }

    @Override
    protected String getEnclosureType() {
        return "application/x-bittorrent";
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
