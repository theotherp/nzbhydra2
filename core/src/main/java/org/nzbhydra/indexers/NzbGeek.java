package org.nzbhydra.indexers;

import com.google.common.base.Joiner;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.config.SearchModuleType;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.Arrays;


public class NzbGeek extends Newznab {

    @Override
    protected String cleanupQuery(String query) {
        //With nzbgeek not more than 6 words at all are allowed
        String[] split = query.split(" ");
        if (query.split(" ").length > 6) {
            query = Joiner.on(" ").join(Arrays.copyOfRange(split, 0, 6));
        }
        return query;
    }

    @Component
    @Order(100)
    public static class NewznabHandlingStrategy implements IndexerHandlingStrategy {

        @Override
        public boolean handlesIndexerConfig(IndexerConfig config) {
            return (config.getSearchModuleType() == SearchModuleType.NEWZNAB && config.getHost().toLowerCase().contains("nzbgeek"));
        }

        @Override
        public Class<? extends Indexer> getIndexerClass() {
            return NzbGeek.class;
        }
    }

}
