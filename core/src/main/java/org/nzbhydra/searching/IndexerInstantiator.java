/*
 *  (C) Copyright 2022 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.searching;

import org.nzbhydra.config.BaseConfigHandler;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.indexers.*;
import org.nzbhydra.indexers.status.IndexerLimitRepository;
import org.nzbhydra.indexers.torbox.Torbox;
import org.nzbhydra.indexers.torznab.Torznab;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.oxm.Unmarshaller;
import org.springframework.stereotype.Component;

@Component
public class IndexerInstantiator {

    @Autowired
    protected ConfigProvider configProvider;
    @Autowired
    protected IndexerRepository indexerRepository;
    @Autowired
    protected SearchResultRepository searchResultRepository;
    @Autowired
    protected IndexerApiAccessRepository indexerApiAccessRepository;
    @Autowired
    protected IndexerApiAccessEntityShortRepository indexerApiAccessShortRepository;
    @Autowired
    private IndexerLimitRepository indexerStatusRepository;
    @Autowired
    protected IndexerWebAccess indexerWebAccess;
    @Autowired
    protected SearchResultAcceptor resultAcceptor;
    @Autowired
    protected CategoryProvider categoryProvider;
    @Autowired
    protected InfoProvider infoProvider;
    @Autowired
    private ApplicationEventPublisher eventPublisher;
    @Autowired
    private QueryGenerator queryGenerator;
    @Autowired
    private CustomQueryAndTitleMappingHandler titleMapping;
    @Autowired
    private Unmarshaller unmarshaller;
    @Autowired
    private BaseConfigHandler baseConfigHandler;
    @Autowired
    private IndexerSearchResultPersistor searchResultPersistor;

    public Indexer instantiateIndexer(String name) {
        switch (name) {
            case "ANIZB" -> {
                return new Anizb(configProvider, indexerRepository, searchResultRepository, indexerApiAccessRepository, indexerApiAccessShortRepository, indexerStatusRepository, indexerWebAccess, resultAcceptor, categoryProvider, infoProvider, eventPublisher, queryGenerator, titleMapping, baseConfigHandler, searchResultPersistor);
            }
            case "BINSEARCH" -> {
                return new Binsearch(configProvider, indexerRepository, searchResultRepository, indexerApiAccessRepository, indexerApiAccessShortRepository, indexerStatusRepository, indexerWebAccess, resultAcceptor, categoryProvider, infoProvider, eventPublisher, queryGenerator, titleMapping, baseConfigHandler, searchResultPersistor);
            }
            case "DOGNZB" -> {
                return new DogNzb(configProvider, indexerRepository, searchResultRepository, indexerApiAccessRepository, indexerApiAccessShortRepository, indexerStatusRepository, indexerWebAccess, resultAcceptor, categoryProvider, infoProvider, eventPublisher, queryGenerator, titleMapping, unmarshaller, baseConfigHandler, searchResultPersistor);
            }
            case "NEWZNAB" -> {
                return new Newznab(configProvider, indexerRepository, searchResultRepository, indexerApiAccessRepository, indexerApiAccessShortRepository, indexerStatusRepository, indexerWebAccess, resultAcceptor, categoryProvider, infoProvider, eventPublisher, queryGenerator, titleMapping, unmarshaller, baseConfigHandler, searchResultPersistor);
            }
            case "WTFNZB" -> {
                return new WtfNzb(configProvider, indexerRepository, searchResultRepository, indexerApiAccessRepository, indexerApiAccessShortRepository, indexerStatusRepository, indexerWebAccess, resultAcceptor, categoryProvider, infoProvider, eventPublisher, queryGenerator, titleMapping, unmarshaller, baseConfigHandler, searchResultPersistor);
            }
            case "NZBINDEX" -> {
                return new NzbIndex(configProvider, indexerRepository, searchResultRepository, indexerApiAccessRepository, indexerApiAccessShortRepository, indexerStatusRepository, indexerWebAccess, resultAcceptor, categoryProvider, infoProvider, eventPublisher, queryGenerator, titleMapping, baseConfigHandler, searchResultPersistor);
            }
            case "NZBINDEX_BETA" -> {
                return new NzbIndexBeta(configProvider, indexerRepository, searchResultRepository, indexerApiAccessRepository, indexerApiAccessShortRepository, indexerStatusRepository, indexerWebAccess, resultAcceptor, categoryProvider, infoProvider, eventPublisher, queryGenerator, titleMapping, baseConfigHandler, searchResultPersistor);
            }
            case "NZBINDEX_API" -> {
                return new NzbIndexApi(configProvider, indexerRepository, searchResultRepository, indexerApiAccessRepository, indexerApiAccessShortRepository, indexerStatusRepository, indexerWebAccess, resultAcceptor, categoryProvider, infoProvider, eventPublisher, queryGenerator, titleMapping, baseConfigHandler, searchResultPersistor);
            }
            case "NZBGEEK" -> {
                return new NzbGeek(configProvider, indexerRepository, searchResultRepository, indexerApiAccessRepository, indexerApiAccessShortRepository, indexerStatusRepository, indexerWebAccess, resultAcceptor, categoryProvider, infoProvider, eventPublisher, queryGenerator, titleMapping, unmarshaller, baseConfigHandler, searchResultPersistor);
            }
            case "NZBKING" -> {
                return new NzbKing(configProvider, indexerRepository, searchResultRepository, indexerApiAccessRepository, indexerApiAccessShortRepository, indexerStatusRepository, indexerWebAccess, resultAcceptor, categoryProvider, infoProvider, eventPublisher, queryGenerator, titleMapping, baseConfigHandler, searchResultPersistor);
            }
            case "TORZNAB" -> {
                return new Torznab(configProvider, indexerRepository, searchResultRepository, indexerApiAccessRepository, indexerApiAccessShortRepository, indexerStatusRepository, indexerWebAccess, resultAcceptor, categoryProvider, infoProvider, eventPublisher, queryGenerator, titleMapping, unmarshaller, baseConfigHandler, searchResultPersistor);
            }
            case "TORBOX" -> {
                return new Torbox(configProvider, indexerRepository, searchResultRepository, indexerApiAccessRepository, indexerApiAccessShortRepository, indexerStatusRepository, indexerWebAccess, resultAcceptor, categoryProvider, infoProvider, eventPublisher, queryGenerator, titleMapping, baseConfigHandler, searchResultPersistor);
            }
        }
        throw new RuntimeException("Unable to instantiate " + name);
    }
}
