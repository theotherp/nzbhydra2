/*
 *  (C) Copyright 2025 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.indexers.torbox;

import org.apache.commons.lang3.tuple.Pair;
import org.nzbhydra.config.BaseConfigHandler;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.indexers.IndexerApiAccessEntityShortRepository;
import org.nzbhydra.indexers.IndexerApiAccessRepository;
import org.nzbhydra.indexers.IndexerApiAccessType;
import org.nzbhydra.indexers.IndexerRepository;
import org.nzbhydra.indexers.IndexerSearchResultPersistor;
import org.nzbhydra.indexers.IndexerWebAccess;
import org.nzbhydra.indexers.NfoResult;
import org.nzbhydra.indexers.QueryGenerator;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.indexers.exceptions.IndexerParsingException;
import org.nzbhydra.indexers.exceptions.IndexerSearchAbortedException;
import org.nzbhydra.indexers.status.IndexerLimitRepository;
import org.nzbhydra.indexers.torbox.mapping.TorboxSearchResponse;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.CustomQueryAndTitleMappingHandler;
import org.nzbhydra.searching.SearchResultAcceptor;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.List;

public class Torbox extends Indexer<Pair<TorboxSearchResponse, TorboxSearchResponse>> {

    public Torbox(ConfigProvider configProvider, IndexerRepository indexerRepository, SearchResultRepository searchResultRepository, IndexerApiAccessRepository indexerApiAccessRepository, IndexerApiAccessEntityShortRepository indexerApiAccessShortRepository, IndexerLimitRepository indexerStatusRepository, IndexerWebAccess indexerWebAccess, SearchResultAcceptor resultAcceptor, CategoryProvider categoryProvider, InfoProvider infoProvider, ApplicationEventPublisher eventPublisher, QueryGenerator queryGenerator, CustomQueryAndTitleMappingHandler titleMapping, BaseConfigHandler baseConfigHandler, IndexerSearchResultPersistor searchResultPersistor) {
        super(configProvider, indexerRepository, searchResultRepository, indexerApiAccessRepository, indexerApiAccessShortRepository, indexerStatusRepository, indexerWebAccess, resultAcceptor, categoryProvider, infoProvider, eventPublisher, queryGenerator, titleMapping, baseConfigHandler, searchResultPersistor);
    }

    @Override
    protected void completeIndexerSearchResult(Pair<TorboxSearchResponse, TorboxSearchResponse> response, IndexerSearchResult indexerSearchResult, SearchResultAcceptor.AcceptorResult acceptorResult, SearchRequest searchRequest, int offset, Integer limit) {

    }

    @Override
    protected List<SearchResultItem> getSearchResultItems(Pair<TorboxSearchResponse, TorboxSearchResponse> searchRequestResponse, SearchRequest searchRequest) throws IndexerParsingException {
        return List.of();
    }

    @Override
    protected UriComponentsBuilder buildSearchUrl(SearchRequest searchRequest, Integer offset, Integer limit) throws IndexerSearchAbortedException {
        return null;
    }

    @Override
    public NfoResult getNfo(String guid) {
        return null;
    }

    @Override
    protected Pair<TorboxSearchResponse, TorboxSearchResponse> getAndStoreResultToDatabase(URI uri, IndexerApiAccessType apiAccessType) throws IndexerAccessException {
        return null;
    }

    @Override
    protected Logger getLogger() {
        return null;
    }
}
