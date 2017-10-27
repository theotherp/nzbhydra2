package org.nzbhydra.indexers;

import lombok.Getter;
import lombok.Setter;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.config.SearchModuleType;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.mapping.newznab.RssItem;
import org.nzbhydra.mapping.newznab.RssRoot;
import org.nzbhydra.mapping.newznab.Xml;
import org.nzbhydra.mapping.newznab.mock.NewznabMockBuilder;
import org.nzbhydra.mapping.newznab.mock.NewznabMockRequest;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.time.Instant;
import java.util.Collections;

@Getter
@Setter
@Component
public class DevIndexer extends Newznab {

    protected Xml getAndStoreResultToDatabase(URI uri, IndexerApiAccessType apiAccessType) throws IndexerAccessException {
        RssRoot rssRoot = new RssRoot();
        if (uri.toString().contains("oneduplicate")) {
            NewznabMockRequest mockRequest = NewznabMockRequest.builder().numberOfResults(1).titleBase("oneresult").titleWords(Collections.emptyList()).total(1).build();
            rssRoot = NewznabMockBuilder.generateResponse(mockRequest);
            rssRoot.getRssChannel().getNewznabResponse().setTotal(1);
            rssRoot.getRssChannel().getItems().get(0).getEnclosure().setLength(100000L);
            rssRoot.getRssChannel().getItems().get(0).getNewznabAttributes().clear();
        } else if (uri.toString().contains("duplicates")) {
            NewznabMockRequest mockRequest = NewznabMockRequest.builder().numberOfResults(10).titleBase("duplicates").titleWords(Collections.emptyList()).total(10).build();
            rssRoot = NewznabMockBuilder.generateResponse(mockRequest);
            rssRoot.getRssChannel().getNewznabResponse().setTotal(10);
            for (RssItem rssItem : rssRoot.getRssChannel().getItems()) {
                rssItem.getEnclosure().setLength(100000L);
                rssItem.getNewznabAttributes().clear();
                rssItem.setPubDate(Instant.now());
            }

        }
        return rssRoot;
    }

    @Component
    @Order(500)
    public static class DevIndexerHandlingStrategy implements IndexerHandlingStrategy {

        @Override
        public boolean handlesIndexerConfig(IndexerConfig config) {
            return config.getSearchModuleType() == SearchModuleType.DEVONLY;
        }

        @Override
        public Class<? extends Indexer> getIndexerClass() {
            return DevIndexer.class;
        }
    }

}
