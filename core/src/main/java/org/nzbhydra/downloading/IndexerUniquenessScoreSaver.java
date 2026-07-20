package org.nzbhydra.downloading;

import jakarta.annotation.PostConstruct;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.indexers.IndexerSearchEntity;
import org.nzbhydra.indexers.IndexerSearchRepository;
import org.nzbhydra.indexers.IndexerSearchResultOccurrenceEntity;
import org.nzbhydra.indexers.IndexerSearchResultOccurrenceRepository;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.searching.uniqueness.IndexerUniquenessScoreEntity;
import org.nzbhydra.searching.uniqueness.IndexerUniquenessScoreEntityRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.TransactionCallbackWithoutResult;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.util.Collection;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class IndexerUniquenessScoreSaver {

    protected static final Logger logger = LoggerFactory.getLogger(IndexerUniquenessScoreSaver.class);

    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private IndexerSearchRepository indexerSearchRepository;
    @Autowired
    private IndexerSearchResultOccurrenceRepository occurrenceRepository;
    @Autowired
    private IndexerUniquenessScoreEntityRepository indexerUniquenessScoreEntityRepository;
    @Autowired
    private PlatformTransactionManager transactionManager;
    private TransactionTemplate transactionTemplate;

    @PostConstruct
    public void init() {
        transactionTemplate = new TransactionTemplate(transactionManager);
    }

    @EventListener
    public void onNzbDownloadEvent(FileDownloadEvent downloadEvent) {
        if (!configProvider.getBaseConfig().getMain().isKeepHistory()) {
            logger.debug("Not saving uniqueness score because no history is kept");
            return;
        }
        transactionTemplate.execute(new TransactionCallbackWithoutResult() {
            @Override
            protected void doInTransactionWithoutResult(TransactionStatus status) {
                handleDownloadEvent(downloadEvent);
            }
        });
    }

    void handleDownloadEvent(FileDownloadEvent downloadEvent) {
        try {
            if (!isEligibleDownload(downloadEvent)) {
                return;
            }
            SearchResultEntity searchResultEntity = downloadEvent.getSearchResultEntity();
            IndexerSearchEntity relatedIndexerSearch = getRelatedIndexerSearch(searchResultEntity);
            if (relatedIndexerSearch == null) {
                logger.debug("Unable to determine indexer uniqueness score for result {} because no indexer search is saved", searchResultEntity.getTitle());
                return;
            }

            Set<IndexerSearchEntity> involvedIndexerSearches = getIndexersInvolved(relatedIndexerSearch);
            Set<IndexerEntity> involvedIndexers = involvedIndexerSearches.stream()
                    .map(IndexerSearchEntity::getIndexerEntity)
                .collect(Collectors.toSet());
            if (!involvedIndexers.contains(searchResultEntity.getIndexer())) {
                logger.debug("Unable to determine indexer uniqueness score for result {} because its indexer was not successfully searched", searchResultEntity.getTitle());
                return;
            }

            Set<IndexerEntity> otherProviders = getIndexersFoundSameResult(searchResultEntity, relatedIndexerSearch, involvedIndexers);
            Set<IndexerSearchEntity> indexersWithoutResult = involvedIndexerSearches.stream()
                    .filter(indexerSearch -> !otherProviders.contains(indexerSearch.getIndexerEntity()))
                    .filter(indexerSearch -> !indexerSearch.getIndexerEntity().equals(searchResultEntity.getIndexer()))
                    .collect(Collectors.toSet());

            saveScoresToDatabase(downloadEvent, searchResultEntity.getIndexer(), otherProviders, involvedIndexerSearches, indexersWithoutResult);
        } catch (Exception e) {
            logger.error("Error while saving data for uniqueness scores", e);
        }
    }

    private void saveScoresToDatabase(FileDownloadEvent downloadEvent, IndexerEntity downloadedFrom, Set<IndexerEntity> otherProviders,
                                      Set<IndexerSearchEntity> involvedIndexerSearches, Set<IndexerSearchEntity> indexersWithoutResult) {
        int involved = involvedIndexerSearches.size();
        int have = otherProviders.size() + 1;
        String observationId = "download-" + downloadEvent.getFileDownloadEntity().getId();
        Instant recordedAt = downloadEvent.getFileDownloadEntity().getTime();
        Set<IndexerUniquenessScoreEntity> scoreEntities = new HashSet<>();
        scoreEntities.add(new IndexerUniquenessScoreEntity(downloadedFrom, involved, have, true, observationId, recordedAt, 3));
        scoreEntities.addAll(otherProviders.stream()
                .map(indexer -> new IndexerUniquenessScoreEntity(indexer, involved, have, true, observationId, recordedAt, 3))
                .toList());
        scoreEntities.addAll(indexersWithoutResult.stream()
                .map(indexerSearch -> new IndexerUniquenessScoreEntity(indexerSearch.getIndexerEntity(), involved, have, false, observationId, recordedAt, 3))
                .toList());
        indexerUniquenessScoreEntityRepository.saveAll(scoreEntities);
    }

    private Set<IndexerSearchEntity> getIndexersInvolved(IndexerSearchEntity indexerSearchEntity) {
        return new HashSet<>(indexerSearchRepository.findBySearchEntity(indexerSearchEntity.getSearchEntity())).stream()
                .filter(indexerSearch -> Boolean.TRUE.equals(indexerSearch.getSuccessful()))
                .collect(Collectors.toSet());
    }

    private Set<IndexerEntity> getIndexersFoundSameResult(SearchResultEntity downloadedResult, IndexerSearchEntity relatedIndexerSearch,
                                                          Set<IndexerEntity> involvedIndexers) {
        String normalizedTitle = DownloadContentTitleNormalizer.normalize(downloadedResult.getTitle());
        Collection<IndexerSearchResultOccurrenceEntity> occurrences = occurrenceRepository
                .findByIndexerSearchSearchEntityId(relatedIndexerSearch.getSearchEntity().getId());
        return occurrences.stream()
                .filter(occurrence -> Boolean.TRUE.equals(occurrence.getIndexerSearch().getSuccessful()))
                .map(IndexerSearchResultOccurrenceEntity::getSearchResult)
                .filter(result -> DownloadContentTitleNormalizer.normalize(result.getTitle()).equals(normalizedTitle))
                .map(SearchResultEntity::getIndexer)
                .filter(involvedIndexers::contains)
                .filter(indexer -> !indexer.equals(downloadedResult.getIndexer()))
                .collect(Collectors.toSet());
    }

    private IndexerSearchEntity getRelatedIndexerSearch(SearchResultEntity searchResultEntity) {
        if (searchResultEntity.getDownloadSearchId() == null) {
            // Legacy IDs do not identify the originating search, so scoring them would fabricate corrected data.
            logger.debug("Unable to determine indexer uniqueness score for result {} because the download identifier has no search context", searchResultEntity.getTitle());
            return null;
        }
        return occurrenceRepository.findBySearchResultAndIndexerSearchSearchEntityId(searchResultEntity, searchResultEntity.getDownloadSearchId()).stream()
                .map(IndexerSearchResultOccurrenceEntity::getIndexerSearch)
                .findFirst()
                .orElse(null);
    }

    private boolean isEligibleDownload(FileDownloadEvent downloadEvent) {
        return switch (downloadEvent.getFileDownloadEntity().getStatus()) {
            case NZB_DOWNLOAD_SUCCESSFUL, NZB_ADDED, REQUESTED -> true;
            default -> false;
        };
    }
}
