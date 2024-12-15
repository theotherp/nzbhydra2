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

package org.nzbhydra.indexers;

import jakarta.persistence.EntityExistsException;
import lombok.extern.slf4j.Slf4j;
import org.nzbhydra.searching.SearchResultIdCalculator;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Component
@Slf4j
public class IndexerSearchResultPersistor {


    private final SearchResultRepository searchResultRepository;

    public IndexerSearchResultPersistor(SearchResultRepository searchResultRepository) {
        this.searchResultRepository = searchResultRepository;
    }

    @Transactional
    public List<SearchResultItem> persistSearchResults(Indexer<?> indexer, List<SearchResultItem> searchResultItems, IndexerSearchResult indexerSearchResult) {
        ArrayList<SearchResultEntity> searchResultEntities = new ArrayList<>();
        Set<Long> alreadySavedIds = searchResultRepository.findAllIdsByIdIn(searchResultItems.stream().map(SearchResultIdCalculator::calculateSearchResultId).collect(Collectors.toList()));
        for (SearchResultItem item : searchResultItems) {
            long guid = SearchResultIdCalculator.calculateSearchResultId(item);
            if (!alreadySavedIds.contains(guid)) {
                SearchResultEntity searchResultEntity = new SearchResultEntity();

                //Set all entity relevant data
                searchResultEntity.setIndexer(indexer.getIndexerEntity());
                searchResultEntity.setTitle(item.getTitle());
                searchResultEntity.setLink(item.getLink());
                searchResultEntity.setDetails(item.getDetails());
                searchResultEntity.setIndexerGuid(item.getIndexerGuid());
                searchResultEntity.setFirstFound(Instant.now());
                searchResultEntity.setDownloadType(item.getDownloadType());
                searchResultEntity.setPubDate(item.getPubDate());
                searchResultEntities.add(searchResultEntity);
            }
            //LATER Unify guid and searchResultId which are the same
            item.setGuid(guid);
            item.setSearchResultId(guid);
        }
        indexer.debug("Found {} results which were already in the database and {} new ones", alreadySavedIds.size(), searchResultEntities.size());
        try {
            searchResultRepository.saveAll(searchResultEntities);
            indexerSearchResult.setSearchResultEntities(new HashSet<>(searchResultEntities));
        } catch (EntityExistsException e) {
            indexer.error("Unable to save the search results to the database", e);
        }

        return searchResultItems;
    }
}
