package org.nzbhydra.indexers;

import com.google.common.base.Joiner;
import org.nzbhydra.config.BaseConfigHandler;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.indexers.status.IndexerLimitRepository;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.CustomQueryAndTitleMappingHandler;
import org.nzbhydra.searching.SearchResultAcceptor;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.core.annotation.Order;
import org.springframework.oxm.Unmarshaller;
import org.springframework.stereotype.Component;

import java.util.Arrays;


public class NzbGeek extends Newznab {


    public NzbGeek(ConfigProvider configProvider, IndexerRepository indexerRepository, SearchResultRepository searchResultRepository, IndexerApiAccessRepository indexerApiAccessRepository, IndexerApiAccessEntityShortRepository indexerApiAccessShortRepository, IndexerLimitRepository indexerStatusRepository, IndexerWebAccess indexerWebAccess, SearchResultAcceptor resultAcceptor, CategoryProvider categoryProvider, InfoProvider infoProvider, ApplicationEventPublisher eventPublisher, QueryGenerator queryGenerator, CustomQueryAndTitleMappingHandler titleMapping, Unmarshaller unmarshaller, BaseConfigHandler baseConfigHandler) {
        super(configProvider, indexerRepository, searchResultRepository, indexerApiAccessRepository, indexerApiAccessShortRepository, indexerStatusRepository, indexerWebAccess, resultAcceptor, categoryProvider, infoProvider, eventPublisher, queryGenerator, titleMapping, unmarshaller, baseConfigHandler);
    }

    @Override
    protected boolean isSwitchToTSearchNeeded(SearchRequest request) {
        return request.getSearchType() == SearchType.MOVIE && request.getQuery().isPresent();
    }

    @Override
    protected String cleanupQuery(String query) {
        //With nzbgeek not more than 6 words at all are allowed
        String[] split = query.split(" ");
        if (query.split(" ").length > 6) {
            query = Joiner.on(" ").join(Arrays.copyOfRange(split, 0, 6));
        }
        return query.replace("\"", "");
    }

    @Component
    @Order(100)
    public static class NewznabHandlingStrategy implements IndexerHandlingStrategy<NzbGeek> {

        @Override
        public boolean handlesIndexerConfig(IndexerConfig config) {
            return (config.getSearchModuleType() == SearchModuleType.NEWZNAB && config.getHost().toLowerCase().contains("nzbgeek"));
        }

        @Override
        public String getName() {
            return "NZBGEEK";
        }
    }

}
