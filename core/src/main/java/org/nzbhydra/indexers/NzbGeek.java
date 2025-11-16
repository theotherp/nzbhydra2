package org.nzbhydra.indexers;

import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.springframework.context.annotation.Scope;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component("nzbgeek")
@Scope("prototype")
public class NzbGeek extends Newznab {

    @Override
    protected boolean isSwitchToTSearchNeeded(SearchRequest request) {
        return request.getSearchType() == SearchType.MOVIE && request.getQuery().isPresent();
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
