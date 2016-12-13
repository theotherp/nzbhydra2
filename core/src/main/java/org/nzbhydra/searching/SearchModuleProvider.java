package org.nzbhydra.searching;

import org.nzbhydra.database.IndexerEntity;
import org.nzbhydra.database.IndexerRepository;
import org.nzbhydra.searching.searchmodules.AbstractSearchModule;
import org.nzbhydra.searching.searchmodules.Newznab;
import org.nzbhydra.searching.searchmodules.SearchModule;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.config.AutowireCapableBeanFactory;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

@Component
public class SearchModuleProvider {

    private static final Map<String, Class<? extends AbstractSearchModule>> searchModuleClasses = new HashMap<>();

    static {
        searchModuleClasses.put("newznab", Newznab.class);
    }

    @Autowired
    private AutowireCapableBeanFactory beanFactory;

    @Autowired
    private IndexerRepository indexerRepository;

    @Autowired
    private SearchModuleConfigProvider searchModuleConfigProvider;

    private Map<String, SearchModule> searchModuleInstances = new HashMap<>();



    @PostConstruct
    public void init() {
        for (IndexerConfig config : searchModuleConfigProvider.getIndexers()) {

            AbstractSearchModule searchModule = null;
            try {
                //searchModule = searchModuleClasses.get(config.getSearchModuleType()).newInstance();
                searchModule = beanFactory.createBean(searchModuleClasses.get(config.getSearchModuleType()));

                IndexerEntity indexerEntity = indexerRepository.findByName(config.getName());
                if (indexerEntity == null) {
                    searchModule = indexerRepository.save(searchModule);
                } else {
                    searchModule.setId(indexerEntity.getId());
                    searchModule.setName(indexerEntity.getName());
                }


                searchModule.initialize(config);
            } catch (Exception e) {
                e.printStackTrace();
            }

            searchModuleInstances.put(config.getName(), searchModule);
        }
    }

    public Collection<SearchModule> getIndexers() {
        return searchModuleInstances.values();
    }





}
