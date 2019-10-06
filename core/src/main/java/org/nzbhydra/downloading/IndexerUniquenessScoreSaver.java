/*
 *  (C) Copyright 2017 TheOtherP (theotherp@gmx.de)
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

package org.nzbhydra.downloading;

import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.indexers.IndexerSearchEntity;
import org.nzbhydra.indexers.IndexerSearchRepository;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.searching.uniqueness.IndexerUniquenessScoreEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class IndexerUniquenessScoreSaver {

    protected static final Logger logger = LoggerFactory.getLogger(IndexerUniquenessScoreSaver.class);

    @Autowired
    private SearchResultRepository searchResultRepository;
    @Autowired
    private IndexerSearchRepository indexerSearchRepository;
//    @Autowired
//    private IndexerUniquenessScoreEntityRepository indexerUniquenessScoreEntityRepository;

    //    @EventListener
    public void onNzbDownloadEvent(FileDownloadEvent downloadEvent) {
        try {
            SearchResultEntity searchResultEntity = downloadEvent.getDownloadEntity().getSearchResult();

            if (searchResultEntity.getIndexerSearchEntity() == null) {
                logger.debug("Unable to determine indexer uniqueness score for result {} because no indexer search is saved", searchResultEntity.getTitle());
                return;
            }

            Set<IndexerSearchEntity> allIndexerSearchesInvolved = getIndexersInvolved(searchResultEntity);
            Set<IndexerEntity> indexersContainingSameResult = getIndexersFoundSameResult(searchResultEntity);

            Set<IndexerSearchEntity> involvedIndexersWithoutResult = allIndexerSearchesInvolved.stream().filter(x -> !indexersContainingSameResult.contains(x.getIndexerEntity())).collect(Collectors.toSet());

            saveScoresToDatabase(indexersContainingSameResult, allIndexerSearchesInvolved, involvedIndexersWithoutResult);

            String indexerNamesWithResult = indexersContainingSameResult.stream().map(IndexerEntity::getName).collect(Collectors.joining(", "));
            String indexerNamesWithoutResult = involvedIndexersWithoutResult.stream().map(x -> x.getIndexerEntity().getName()).collect(Collectors.joining(", "));
            logger.info("Title: \"{}\". Indexers with result: {}. Indexers without result: {}", searchResultEntity.getTitle(), indexerNamesWithResult, indexerNamesWithoutResult);
        } catch (Exception e) {
            logger.error("Error while saving data for uniqueness scores");
        }
    }

    private void saveScoresToDatabase(Set<IndexerEntity> indexersContainingSameResult, Set<IndexerSearchEntity> allIndexerSearchesInvolved, Set<IndexerSearchEntity> involvedIndexersWithoutResult) {
        List<IndexerUniquenessScoreEntity> scoreEntities = new ArrayList<>();

        scoreEntities.addAll(indexersContainingSameResult.stream().map(x -> new IndexerUniquenessScoreEntity(x, allIndexerSearchesInvolved.size(), indexersContainingSameResult.size(), true)).collect(Collectors.toList()));
        scoreEntities.addAll(involvedIndexersWithoutResult.stream().map(x -> new IndexerUniquenessScoreEntity(x.getIndexerEntity(), allIndexerSearchesInvolved.size(), indexersContainingSameResult.size(), false)).collect(Collectors.toList()));
//        indexerUniquenessScoreEntityRepository.saveAll(scoreEntities);
    }

    private Set<IndexerSearchEntity> getIndexersInvolved(SearchResultEntity searchResultEntity) {
        IndexerSearchEntity indexerSearchEntity = searchResultEntity.getIndexerSearchEntity();
        return new HashSet<>(indexerSearchRepository.findBySearchEntity(indexerSearchEntity.getSearchEntity())).stream().filter(IndexerSearchEntity::getSuccessful).collect(Collectors.toSet());
    }

    private Set<IndexerEntity> getIndexersFoundSameResult(SearchResultEntity searchResultEntity) {
        Set<SearchResultEntity> resultsWithSameTitle = searchResultRepository.findAllByTitleLikeIgnoreCase(searchResultEntity.getTitle().replaceAll("[ .\\-_]", "_"));
        Set<IndexerEntity> indexersContainingSameResult = new HashSet<>();
        for (SearchResultEntity searchResult : resultsWithSameTitle) {
            if (searchResult == searchResultEntity) {
                continue;
            }
            if (!searchResult.getIndexerSearchEntity().getSuccessful()) {
                continue;
            }
            indexersContainingSameResult.add(searchResult.getIndexer());
        }
        return indexersContainingSameResult;
    }


}
