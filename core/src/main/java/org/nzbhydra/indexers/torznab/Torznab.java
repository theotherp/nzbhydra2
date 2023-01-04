/*
 *  (C) Copyright 2017 TheOtherP (theotherp@posteo.net)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.nzbhydra.indexers.torznab;

import lombok.Getter;
import lombok.Setter;
import org.nzbhydra.NzbHydraException;
import org.nzbhydra.config.BaseConfigHandler;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.indexers.IndexerApiAccessEntityShortRepository;
import org.nzbhydra.indexers.IndexerApiAccessRepository;
import org.nzbhydra.indexers.IndexerHandlingStrategy;
import org.nzbhydra.indexers.IndexerRepository;
import org.nzbhydra.indexers.IndexerWebAccess;
import org.nzbhydra.indexers.Newznab;
import org.nzbhydra.indexers.QueryGenerator;
import org.nzbhydra.indexers.exceptions.IndexerSearchAbortedException;
import org.nzbhydra.indexers.status.IndexerLimitRepository;
import org.nzbhydra.mapping.newznab.xml.NewznabAttribute;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlChannel;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.nzbhydra.mapping.newznab.xml.Xml;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.CustomQueryAndTitleMapping;
import org.nzbhydra.searching.SearchResultAcceptor;
import org.nzbhydra.searching.SearchResultAcceptor.AcceptorResult;
import org.nzbhydra.searching.SearchResultIdCalculator;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem.DownloadType;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem.HasNfo;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.core.annotation.Order;
import org.springframework.oxm.Unmarshaller;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Getter
@Setter
public class Torznab extends Newznab {

    private static final Logger logger = LoggerFactory.getLogger(Torznab.class);

    public Torznab(ConfigProvider configProvider, IndexerRepository indexerRepository, SearchResultRepository searchResultRepository, IndexerApiAccessRepository indexerApiAccessRepository, IndexerApiAccessEntityShortRepository indexerApiAccessShortRepository, IndexerLimitRepository indexerStatusRepository, IndexerWebAccess indexerWebAccess, SearchResultAcceptor resultAcceptor, CategoryProvider categoryProvider, InfoProvider infoProvider, ApplicationEventPublisher eventPublisher, QueryGenerator queryGenerator, CustomQueryAndTitleMapping titleMapping, Unmarshaller unmarshaller, BaseConfigHandler baseConfigHandler) {
        super(configProvider, indexerRepository, searchResultRepository, indexerApiAccessRepository, indexerApiAccessShortRepository, indexerStatusRepository, indexerWebAccess, resultAcceptor, categoryProvider, infoProvider, eventPublisher, queryGenerator, titleMapping, unmarshaller, baseConfigHandler);
    }

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
        if (item.getSize() != null) {
            searchResultItem.setSize(item.getSize());
        } else if (item.getTorznabAttributes().stream().noneMatch(x -> x.getName().equals("size"))) {
            searchResultItem.getAttributes().put("size", String.valueOf(item.getSize()));
        }
        List<Integer> foundCategories = tryAndGetCategoryAsNumber(item);
        if (!foundCategories.isEmpty()) {
            computeCategory(searchResultItem, foundCategories);
        } else {
            searchResultItem.setCategory(categoryProvider.getNotAvailable());
        }
        searchResultItem.setHasNfo(HasNfo.NO);
        searchResultItem.setIndexerScore(config.getScore());
        searchResultItem.setDownloadType(DownloadType.TORRENT);
        searchResultItem.setGuid(SearchResultIdCalculator.calculateSearchResultId(searchResultItem));
        searchResultItem.setDetails(item.getComments());

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
    protected String getEnclosureType() {
        return "application/x-bittorrent";
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
