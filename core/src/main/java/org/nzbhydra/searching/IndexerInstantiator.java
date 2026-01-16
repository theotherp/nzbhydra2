

package org.nzbhydra.searching;

import org.nzbhydra.config.BaseConfigHandler;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.indexers.*;
import org.nzbhydra.indexers.status.IndexerLimitRepository;
import org.nzbhydra.indexers.torbox.Torbox;
import org.nzbhydra.indexers.torznab.Torznab;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.springframework.beans.factory.BeanFactory;
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
    @Autowired
    private BeanFactory beanFactory;

    public Indexer instantiateIndexer(String name) {
        switch (name.toUpperCase()) {
            case "ANIZB" -> {
                return beanFactory.getBean("anizb", Anizb.class);
            }
            case "BINSEARCH" -> {
                return beanFactory.getBean("binsearch", Binsearch.class);
            }
            case "DOGNZB" -> {
                return beanFactory.getBean("dognzb", DogNzb.class);
            }
            case "NEWZNAB" -> {
                return beanFactory.getBean("newznab", Newznab.class);
            }
            case "WTFNZB" -> {
                return beanFactory.getBean("wtfnzb", WtfNzb.class);
            }
            case "NZBINDEX" -> {
                return beanFactory.getBean("nzbindex", NzbIndex.class);
            }
            case "NZBINDEX_BETA" -> {
                return beanFactory.getBean("nzbindexbeta", NzbIndexBeta.class);
            }
            case "NZBINDEX_API" -> {
                return beanFactory.getBean("nzbindexapi", NzbIndexApi.class);
            }
            case "NZBGEEK" -> {
                return beanFactory.getBean("nzbgeek", NzbGeek.class);
            }
            case "NZBKING" -> {
                return beanFactory.getBean("nzbking", NzbKing.class);
            }
            case "TORZNAB" -> {
                return beanFactory.getBean("torznab", Torznab.class);
            }
            case "TORBOX" -> {
                return beanFactory.getBean("torbox", Torbox.class);
            }
        }
        throw new RuntimeException("Unable to instantiate " + name);
    }
}
