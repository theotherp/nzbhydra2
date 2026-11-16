package org.nzbhydra.searching;

import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.indexers.IndexerApiAccessEntityShort;
import org.nzbhydra.indexers.IndexerApiAccessEntityShortRepository;
import org.nzbhydra.indexers.IndexerApiAccessType;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.indexers.IndexerHandlingStrategy;
import org.nzbhydra.indexers.IndexerRepository;
import org.nzbhydra.indexers.status.IndexerLimit;
import org.nzbhydra.indexers.status.IndexerLimitRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Component
public class SearchModuleProvider {

    private static final Logger logger = LoggerFactory.getLogger(SearchModuleProvider.class);

    @Autowired
    private IndexerRepository indexerRepository;
    @Autowired
    private IndexerApiAccessEntityShortRepository shortRepository;
    @Autowired
    private IndexerLimitRepository indexerStatusRepository;
    @Autowired
    private IndexerInstantiator indexerInstantiator;

    /**
     * Replaced as a whole by {@link #loadIndexers(List)} once the new map is complete, so readers never see a partially
     * loaded set of indexers. Readers must read the field once per call. A {@link HashMap} is kept inside so the
     * iteration order callers see stays the same as before.
     */
    private volatile Map<String, Indexer<?>> searchModuleInstances = Collections.emptyMap();
    /**
     * Written by caps check threads (possibly several in parallel) and read by {@link #loadIndexers(List)}.
     */
    private final Map<String, Integer> apiHitsToStoreInitially = new ConcurrentHashMap<>();

    @Autowired
    private List<IndexerHandlingStrategy<?>> indexerHandlingStrategies;



    public List<Indexer<?>> getIndexers() {
        return new ArrayList<>(searchModuleInstances.values());
    }

    public List<Indexer<?>> getEnabledIndexers() {
        final Map<String, Indexer<?>> instances = searchModuleInstances;
        return instances.values().stream().filter(x -> x.getConfig().getState() == IndexerConfig.State.ENABLED).collect(Collectors.toList());
    }

    public Indexer<?> getIndexerByName(String indexerName) {
        final Map<String, Indexer<?>> instances = searchModuleInstances;
        if (instances.containsKey(indexerName)) {
            return instances.get(indexerName);
        } else {
            throw new RuntimeException("Unable to find indexer with name " + indexerName);
        }
    }


    /**
     * Must be called by <tt>{@link SearchModuleConfigProvider}</tt> when config is loaded.
     */
    @Transactional
    public void loadIndexers(List<IndexerConfig> indexers) {
        if (indexers == null) {
            logger.error("Indexers not set. Check your configuration");
            return;
        }
        logger.info("Loading indexers");
        final Map<String, Indexer<?>> newInstances = new HashMap<>();
        for (IndexerConfig config : indexers) {
            try {
                Optional<IndexerHandlingStrategy<?>> optionalStrategy = indexerHandlingStrategies.stream().filter(x -> x.handlesIndexerConfig(config)).findFirst();
                if (optionalStrategy.isEmpty()) {
                    logger.error("Unable to find implementation for indexer type {} and host {}", config.getSearchModuleType(), config.getHost());
                    continue;
                }

                Indexer<?> searchModule = indexerInstantiator.instantiateIndexer(optionalStrategy.get().getName());
                logger.info("Initializing indexer {}", config.getName());

                IndexerEntity indexerEntity = indexerRepository.findByName(config.getName());
                if (indexerEntity == null) {
                    logger.info("Indexer with name {} not yet in database. Adding it", config.getName());
                    indexerEntity = new IndexerEntity();
                    indexerEntity.setName(config.getName());
                    indexerEntity = indexerRepository.save(indexerEntity);
                    logger.info("Now {} indexers in database", indexerRepository.count());
                }
                final Integer apiHitsToStore = apiHitsToStoreInitially.remove(config.getName());
                if (apiHitsToStore != null) {
                    IndexerEntity finalIndexerEntity = indexerEntity;
                    shortRepository.saveAll(IntStream.range(0, apiHitsToStore).mapToObj(x -> new IndexerApiAccessEntityShort(finalIndexerEntity, true, IndexerApiAccessType.SEARCH)).collect(Collectors.toList()));
                }

                IndexerLimit indexerStatus = indexerStatusRepository.findByIndexer(indexerEntity);
                if (indexerStatus == null) {
                    indexerStatus = new IndexerLimit(indexerEntity);
                    indexerStatusRepository.save(indexerStatus);
                }

                searchModule.initialize(config, indexerEntity);
                newInstances.put(config.getName(), searchModule);
            } catch (Exception e) {
                logger.error("Unable to instantiate indexer with name {} and type {}", config.getName(), config.getSearchModuleType(), e);
            }
        }
        searchModuleInstances = Collections.unmodifiableMap(newInstances);
        logger.info("Finished initializing active indexers");
        List<String> indexerNames = indexers.stream().map(IndexerConfig::getName).toList();

        if (newInstances.isEmpty()) {
            logger.warn("No indexers configured");
        }
    }

    public void registerApiHitLimits(String indexerName, int hits) {
        apiHitsToStoreInitially.merge(indexerName, hits, Integer::sum);
    }
}
