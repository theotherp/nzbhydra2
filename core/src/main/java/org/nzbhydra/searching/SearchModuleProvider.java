package org.nzbhydra.searching;

import org.nzbhydra.database.IndexerEntity;
import org.nzbhydra.database.IndexerRepository;
import org.nzbhydra.database.IndexerStatusEntity;
import org.nzbhydra.searching.searchmodules.AbstractIndexer;
import org.nzbhydra.searching.searchmodules.Indexer;
import org.nzbhydra.searching.searchmodules.Newznab;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.config.AutowireCapableBeanFactory;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class SearchModuleProvider {

    private static final Logger logger = LoggerFactory.getLogger(SearchModuleProvider.class);

    private static final Map<String, Class<? extends AbstractIndexer>> searchModuleClasses = new HashMap<>();

    static {
        searchModuleClasses.put("newznab", Newznab.class);
    }

    @Autowired
    private AutowireCapableBeanFactory beanFactory;

    @Autowired
    private IndexerRepository indexerRepository;

    @Autowired
    private SearchModuleConfigProvider searchModuleConfigProvider;

    private Map<String, Indexer> searchModuleInstances = new HashMap<>();

    @PostConstruct
    public void init() {
        if (searchModuleConfigProvider.getIndexers() == null) {
            logger.error("Indexers not set. Check your configuration");
            return;
        }
        for (IndexerConfig config : searchModuleConfigProvider.getIndexers()) {
            try {
                AbstractIndexer searchModule = beanFactory.createBean(SearchModuleProvider.searchModuleClasses.get(config.getSearchModuleType()));
                logger.info("Found indexer {}", config.getName());

                IndexerEntity indexerEntity = indexerRepository.findByName(config.getName());
                if (indexerEntity == null) {
                    logger.info("Did not find indexer with name {} in database. Adding it", config.getName());
                    indexerEntity = new IndexerEntity();
                    indexerEntity.setName(config.getName());
                    indexerEntity.setStatus(new IndexerStatusEntity());
                    indexerEntity = indexerRepository.save(indexerEntity);
                }

                searchModule.initialize(config, indexerEntity);
                searchModuleInstances.put(config.getName(), searchModule);
            } catch (Exception e) {
                logger.error("Unable to instantiate indexer with name {} and type {}", config.getName(), config.getSearchModuleType());
            }
        }
    }

    public List<Indexer> getIndexers() {
        return new ArrayList<>(searchModuleInstances.values());
    }


}
