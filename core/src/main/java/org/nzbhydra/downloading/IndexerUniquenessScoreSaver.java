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

package org.nzbhydra.downloading;

import org.hibernate.Session;
import org.hibernate.SessionFactory;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.indexers.IndexerSearchEntity;
import org.nzbhydra.indexers.IndexerSearchRepository;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.searching.uniqueness.IndexerUniquenessScoreEntity;
import org.nzbhydra.searching.uniqueness.IndexerUniquenessScoreEntityRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import javax.persistence.EntityManagerFactory;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class IndexerUniquenessScoreSaver {

    protected static final Logger logger = LoggerFactory.getLogger(IndexerUniquenessScoreSaver.class);

    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private SearchResultRepository searchResultRepository;
    @Autowired
    private IndexerSearchRepository indexerSearchRepository;
    @Autowired
    private IndexerUniquenessScoreEntityRepository indexerUniquenessScoreEntityRepository;
    @Autowired
    private EntityManagerFactory entityManagerFactory;

    @EventListener
    public void onNzbDownloadEvent(FileDownloadEvent downloadEvent) {
        if (!configProvider.getBaseConfig().getMain().isKeepHistory()) {
            logger.debug("Not saving uniqueness score because no history is kept");
            return;
        }

        handleDownloadEvent(downloadEvent);
    }

    @Transactional
    public void handleDownloadEvent(FileDownloadEvent downloadEvent) {
        try (Session session = entityManagerFactory.unwrap(SessionFactory.class).openSession()) {
            //For some reason the IndexerSearchEntity is not readable (LazyInitializationException) if the result is not loaded again
            SearchResultEntity searchResultEntity = session.load(SearchResultEntity.class, downloadEvent.getSearchResultEntity().getId());

            if (searchResultEntity.getIndexerSearchEntity() == null) {
                logger.debug("Unable to determine indexer uniqueness score for result {} because no indexer search is saved", searchResultEntity.getTitle());
                return;
            }

            Set<IndexerSearchEntity> allIndexerSearchesInvolved = getIndexersInvolved(searchResultEntity);

            Set<IndexerEntity> indexersContainingSameResult = getIndexersFoundSameResult(searchResultEntity);

            Set<IndexerSearchEntity> involvedIndexersWithoutResult = allIndexerSearchesInvolved.stream().filter(x -> !indexersContainingSameResult.contains(x.getIndexerEntity()) && !x.getIndexerEntity().equals(searchResultEntity.getIndexer()))
                    .collect(Collectors.toSet());

            saveScoresToDatabase(searchResultEntity.getIndexer(), indexersContainingSameResult, allIndexerSearchesInvolved, involvedIndexersWithoutResult);

            String indexerNamesWithResult = indexersContainingSameResult.stream().map(IndexerEntity::getName).collect(Collectors.joining(", "));
            String indexerNamesWithoutResult = involvedIndexersWithoutResult.stream().map(x -> x.getIndexerEntity().getName()).collect(Collectors.joining(", "));
            if (indexerNamesWithoutResult.isEmpty()) {
                indexerNamesWithoutResult = "<None>";
            }

            if (indexersContainingSameResult.isEmpty()) {
                logger.info("Title: \"{}\". Downloaded unique result from: {}. All other indexers without result: {}", searchResultEntity.getTitle(), searchResultEntity.getIndexer().getName(), indexerNamesWithoutResult);
            } else {
                logger.info("Title: \"{}\". Downloaded from: {}. Indexers with same result: {}. Indexers without result: {}", searchResultEntity.getTitle(), searchResultEntity.getIndexer().getName(), indexerNamesWithResult, indexerNamesWithoutResult);
            }
        } catch (Exception e) {
            logger.error("Error while saving data for uniqueness scores", e);
        }
    }

    private void saveScoresToDatabase(IndexerEntity indexerDownloadedFrom, Set<IndexerEntity> indexersContainingSameResult, Set<IndexerSearchEntity> allIndexerSearchesInvolved, Set<IndexerSearchEntity> involvedIndexersWithoutResult) {
        List<IndexerUniquenessScoreEntity> scoreEntities = new ArrayList<>();

        int involved = allIndexerSearchesInvolved.size();
        int haveResult = indexersContainingSameResult.size() + 1;
        scoreEntities.add(new IndexerUniquenessScoreEntity(indexerDownloadedFrom, involved, haveResult, true));
        scoreEntities.addAll(indexersContainingSameResult.stream().map(x -> new IndexerUniquenessScoreEntity(x, involved, haveResult, true)).collect(Collectors.toList()));
        scoreEntities.addAll(involvedIndexersWithoutResult.stream().map(x -> new IndexerUniquenessScoreEntity(x.getIndexerEntity(), involved, haveResult, false)).collect(Collectors.toList()));
        indexerUniquenessScoreEntityRepository.saveAll(scoreEntities);
    }


    private Set<IndexerSearchEntity> getIndexersInvolved(SearchResultEntity searchResultEntity) {
        IndexerSearchEntity indexerSearchEntity = searchResultEntity.getIndexerSearchEntity();
        return new HashSet<>(indexerSearchRepository.findBySearchEntity(indexerSearchEntity.getSearchEntity())).stream().filter(IndexerSearchEntity::getSuccessful).collect(Collectors.toSet());
    }

    private Set<IndexerEntity> getIndexersFoundSameResult(SearchResultEntity searchResultEntity) {
        Set<SearchResultEntity> resultsWithSameTitle = searchResultRepository.findAllByTitleLikeIgnoreCase(searchResultEntity.getTitle().replaceAll("[ .\\-_]", "_"));
        Set<IndexerEntity> indexersContainingSameResult = new HashSet<>();
        for (SearchResultEntity searchResult : resultsWithSameTitle) {
            if (searchResult.getIndexer().equals(searchResultEntity.getIndexer())) {
                continue;
            }
            if (searchResult.getIndexerSearchEntity() != null && !searchResult.getIndexerSearchEntity().getSuccessful()) {
                continue;
            }
            indexersContainingSameResult.add(searchResult.getIndexer());
        }
        return indexersContainingSameResult;
    }


}
