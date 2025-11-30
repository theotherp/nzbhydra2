package org.nzbhydra.config;

import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.indexers.IndexerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Service for handling database operations related to indexer configuration changes.
 * This includes renaming and deleting indexers along with their related data.
 */
@Service
public class IndexerConfigService {

    private static final Logger logger = LoggerFactory.getLogger(IndexerConfigService.class);

    @Autowired
    private IndexerRepository indexerRepository;

    @Autowired
    private ConfigProvider configProvider;

    /**
     * Handles all database operations for indexer configuration changes.
     * This includes renaming indexers and deleting removed indexers along with their related data.
     *
     * @param newConfig the new configuration being applied
     */
    @Transactional
    public void handleIndexerConfigChanges(BaseConfig newConfig) {
        handleRenamedIndexers(newConfig);
        handleDeletedIndexers(newConfig);
    }

    private void handleRenamedIndexers(BaseConfig newConfig) {
        final Set<String> loggedSameNameAndApiKey = new HashSet<>();
        for (IndexerConfig newIndexer : newConfig.getIndexers()) {
            final boolean alreadyExistedBefore = configProvider.getBaseConfig().getIndexers().stream()
                    .filter(x -> x != newIndexer)
                    .anyMatch(x -> x.getName().equals(newIndexer.getName()));
            if (alreadyExistedBefore) {
                // If an indexer with the same name already existed before it can't have been renamed
                continue;
            }

            final Optional<IndexerConfig> sameOldIndexer = configProvider.getBaseConfig().getIndexers().stream()
                    .filter(x -> !x.getName().equals(newIndexer.getName()))
                    .filter(x -> IndexerConfig.isIndexerEquals(newIndexer, x))
                    .findFirst();
            if (sameOldIndexer.isPresent()) {
                logger.info("Indexer was renamed from {} to {}", sameOldIndexer.get().getName(), newIndexer.getName());
                try {
                    final IndexerEntity indexerEntity = indexerRepository.findByName(sameOldIndexer.get().getName());
                    if (indexerEntity != null) {
                        indexerEntity.setName(newIndexer.getName());
                        indexerRepository.save(indexerEntity);
                    }
                } catch (Exception e) {
                    logger.error("Error while renaming indexer", e);
                }
            }
        }
    }

    private void handleDeletedIndexers(BaseConfig newConfig) {
        List<String> newIndexerNames = newConfig.getIndexers().stream()
                .map(IndexerConfig::getName)
                .collect(Collectors.toList());

        if (newIndexerNames.isEmpty()) {
            // All indexers removed - delete all indexer entities
            Collection<IndexerEntity> allIndexers = indexerRepository.findAll();
            for (IndexerEntity indexerEntity : allIndexers) {
                logger.info("Deleting indexer {} and its related data because it was removed from the config", indexerEntity.getName());
            }
            // Use native query to trigger database-level cascade delete
            indexerRepository.deleteAllNative();
        } else {
            Collection<IndexerEntity> indexersToDelete = indexerRepository.findByNameNotIn(newIndexerNames);
            for (IndexerEntity indexerEntity : indexersToDelete) {
                logger.info("Deleting indexer {} and its related data because it was removed from the config", indexerEntity.getName());
                // Use native query to trigger database-level cascade delete
                indexerRepository.deleteByIdNative(indexerEntity.getId());
            }
        }
    }
}
