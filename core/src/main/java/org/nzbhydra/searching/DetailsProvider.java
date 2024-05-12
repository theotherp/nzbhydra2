/*
 *  (C) Copyright 2024 TheOtherP (theotherp@posteo.net)
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

import org.nzbhydra.indexers.DetailsResult;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class DetailsProvider {

    private final SearchResultRepository searchResultRepository;
    private final SearchModuleProvider searchModuleProvider;

    public DetailsProvider(SearchResultRepository searchResultRepository, SearchModuleProvider searchModuleProvider) {
        this.searchResultRepository = searchResultRepository;
        this.searchModuleProvider = searchModuleProvider;
    }

    public DetailsResult getDetails(String resultId) {
        Optional<SearchResultEntity> searchResult = searchResultRepository.findById(Long.parseLong(resultId));
        if (searchResult.isEmpty()) {
            return null;
        }
        Indexer indexer = searchModuleProvider.getIndexerByName(searchResult.get().getIndexer().getName());
        try {
            return indexer.getDetails(searchResult.get().getIndexerGuid());
        } catch (IndexerAccessException e) {
            return DetailsResult.unsuccessful(e.getMessage());
        }
    }
}
