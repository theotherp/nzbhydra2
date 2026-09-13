

package org.nzbhydra.indexers.torznab;

import lombok.Getter;
import lombok.Setter;
import org.nzbhydra.NzbHydraException;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.indexers.IndexerHandlingStrategy;
import org.nzbhydra.indexers.Newznab;
import org.nzbhydra.indexers.exceptions.IndexerSearchAbortedException;
import org.nzbhydra.mapping.newznab.xml.NewznabAttribute;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlChannel;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.nzbhydra.mapping.newznab.xml.Xml;
import org.nzbhydra.searching.SearchResultAcceptor.AcceptorResult;
import org.nzbhydra.searching.SearchResultIdCalculator;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem.HasNfo;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Scope;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

import static org.nzbhydra.misc.NumberParsing.parseIntOrNull;

@Getter
@Setter
@Component("torznab")
@Scope("prototype")
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
                case "grabs" -> setIfNotNull(parseIntOrNull(attribute.getValue()), searchResultItem::setGrabs);
                case "guid" -> searchResultItem.setIndexerGuid(attribute.getValue());
                case "seeders" -> setIfNotNull(parseIntOrNull(attribute.getValue()), searchResultItem::setSeeders);
                case "peers" -> setIfNotNull(parseIntOrNull(attribute.getValue()), searchResultItem::setPeers);
            }
        }
        if (item.getSize() != null) {
            searchResultItem.setSize(item.getSize());
        } else if (item.getTorznabAttributes().stream().noneMatch(x -> x.getName().equals("size"))) {
            debug("Result {} does not contain a size", item.getTitle());
        }
        List<Integer> foundCategories = tryAndGetCategoryAsNumber(item);
        if (!foundCategories.isEmpty()) {
            newznabCategoryComputer.computeCategory(searchResultItem, foundCategories, config);
        } else {
            searchResultItem.setCategory(categoryProvider.getNotAvailable());
        }
        searchResultItem.setHasNfo(HasNfo.NO);
        searchResultItem.setIndexerScore(config.getScore());
        searchResultItem.setDownloadType(DownloadType.TORRENT);
        searchResultItem.setGuid(SearchResultIdCalculator.calculateSearchResultHash(searchResultItem));
        searchResultItem.setDetails(item.getComments());

        return searchResultItem;
    }

    protected List<Integer> tryAndGetCategoryAsNumber(NewznabXmlItem item) {
        Set<Integer> foundCategories = new HashSet<>();
        if (item.getCategory() != null) {
            final Integer category = parseIntOrNull(item.getCategory());
            if (category != null) {
                foundCategories.add(category);
            }
        }

        foundCategories.addAll(item.getNewznabAttributes().stream().filter(x -> x.getName().equals("category")).map(x -> parseIntOrNull(x.getValue())).filter(Objects::nonNull).toList());
        foundCategories.addAll(item.getTorznabAttributes().stream().filter(x -> x.getName().equals("category")).map(x -> parseIntOrNull(x.getValue())).filter(Objects::nonNull).toList());
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
        indexerSearchResult.setPageSize(10000);
    }

    @Override
    protected UriComponentsBuilder buildSearchUrl(SearchRequest searchRequest, Integer offset, Integer limit) throws IndexerSearchAbortedException {
        //Jackett doesn't support or require paging, so we overwrite offset and limit
        return super.buildSearchUrl(searchRequest, null, null);
    }

    @Override
    protected void calculateAndAddCategories(SearchRequest searchRequest, UriComponentsBuilder componentsBuilder) {
        if (!configProvider.getBaseConfig().getSearching().isSendTorznabCategories()) {
            logger.debug("Not adding categories to query");
            return;
        }
        super.calculateAndAddCategories(searchRequest, componentsBuilder);
    }

    @Override
    protected List<String> getEnclosureTypes() {
        return List.of("application/x-bittorrent", "application/x-bittorrent;x-scheme-handler/magnet");
    }

    protected Logger getLogger() {
        return logger;
    }

    @Component
    @Order(2000)
    public static class NewznabHandlingStrategy implements IndexerHandlingStrategy<Torznab> {

        @Override
        public boolean handlesIndexerConfig(IndexerConfig config) {
            return config.getSearchModuleType() == SearchModuleType.TORZNAB;
        }

        @Override
        public String getName() {
            return "TORZNAB";
        }

    }


}
