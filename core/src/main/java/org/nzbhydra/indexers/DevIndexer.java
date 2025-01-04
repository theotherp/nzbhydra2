package org.nzbhydra.indexers;

import lombok.Getter;
import lombok.Setter;
import org.nzbhydra.NzbHydraException;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.mapping.newznab.mock.NewznabMockBuilder;
import org.nzbhydra.mapping.newznab.mock.NewznabMockRequest;
import org.nzbhydra.mapping.newznab.xml.NewznabAttribute;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.nzbhydra.mapping.newznab.xml.Xml;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.springframework.context.annotation.Scope;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.time.Instant;
import java.util.Collections;

@Getter
@Setter
@Component("devindexer")
@Scope("prototype")
public class DevIndexer extends Newznab {


    protected Xml getAndStoreResultToDatabase(URI uri, IndexerApiAccessType apiAccessType) throws IndexerAccessException {


        NewznabXmlRoot rssRoot = new NewznabXmlRoot();
        if (uri.toString().contains("oneduplicate")) {
            NewznabMockRequest mockRequest = NewznabMockRequest.builder().numberOfResults(1).titleBase("oneresult").titleWords(Collections.emptyList()).total(1).build();
            rssRoot = NewznabMockBuilder.generateResponse(mockRequest);
            rssRoot.getRssChannel().getNewznabResponse().setTotal(1);
            rssRoot.getRssChannel().getItems().get(0).getEnclosure().setLength(100000L);
            rssRoot.getRssChannel().getItems().get(0).getNewznabAttributes().clear();
        } else if (uri.toString().contains("duplicatesandtitlegroups")) {
            //One duplicate
            NewznabMockRequest mockRequest = NewznabMockRequest.builder().numberOfResults(1).titleBase("oneresult").titleWords(Collections.emptyList()).total(1).build();
            rssRoot = NewznabMockBuilder.generateResponse(mockRequest);
            rssRoot.getRssChannel().getItems().get(0).getEnclosure().setLength(100000L);
            rssRoot.getRssChannel().getItems().get(0).getNewznabAttributes().clear();
            rssRoot.getRssChannel().getItems().get(0).getTorznabAttributes().clear();
            rssRoot.getRssChannel().getItems().get(0).getNewznabAttributes().add(new NewznabAttribute("grabs", "100"));

            //Another duplicate in the same title group
            mockRequest = NewznabMockRequest.builder().numberOfResults(1).titleBase("oneresult").titleWords(Collections.emptyList()).total(1).build();
            NewznabXmlRoot rssRoot3 = NewznabMockBuilder.generateResponse(mockRequest);
            rssRoot3.getRssChannel().getItems().get(0).getEnclosure().setLength(200000L);
            rssRoot3.getRssChannel().getItems().get(0).getNewznabAttributes().clear();
            rssRoot3.getRssChannel().getItems().get(0).getTorznabAttributes().clear();
            rssRoot3.getRssChannel().getItems().get(0).getNewznabAttributes().add(new NewznabAttribute("grabs", "2000"));
            rssRoot3.getRssChannel().getItems().get(0).setLink("anotherlink"); //Otherwise it will result in a unique key exception
            rssRoot.getRssChannel().getItems().add(rssRoot3.getRssChannel().getItems().get(0));

            //Will be a grouped title but have no duplicates
            mockRequest = NewznabMockRequest.builder().numberOfResults(1).titleBase("anotherresult").titleWords(Collections.emptyList()).total(1).build();
            NewznabXmlRoot rssRoot2 = NewznabMockBuilder.generateResponse(mockRequest);
            rssRoot.getRssChannel().getItems().add(rssRoot2.getRssChannel().getItems().get(0));

            rssRoot.getRssChannel().getNewznabResponse().setTotal(3);

        }
        else if (uri.toString().contains("duplicates")) {
            NewznabMockRequest mockRequest = NewznabMockRequest.builder().numberOfResults(10).titleBase("duplicates").titleWords(Collections.emptyList()).total(10).build();
            rssRoot = NewznabMockBuilder.generateResponse(mockRequest);
            rssRoot.getRssChannel().getNewznabResponse().setTotal(10);
            for (NewznabXmlItem rssItem : rssRoot.getRssChannel().getItems()) {
                rssItem.getEnclosure().setLength(100000L);
                rssItem.getNewznabAttributes().clear();
                rssItem.setPubDate(Instant.now());
                rssItem.setDescription("Indexer: " + getName() + ", title:" + rssItem.getTitle());
            }

        }  else if (uri.toString().contains("tworesults")) {
            rssRoot = NewznabMockBuilder.generateResponse(0, 2, "results", false, Collections.emptyList(), false, 0);
            rssRoot.getRssChannel().getNewznabResponse().setTotal(2);
        }

        else {
            rssRoot = NewznabMockBuilder.generateResponse(0, 100, "results", false, Collections.emptyList(), false, 0);
            rssRoot.getRssChannel().getNewznabResponse().setTotal(100);
        }
        if (uri.toString().contains("punkte")) {
            rssRoot.getRssChannel().getItems().get(0).setTitle("a a");
            rssRoot.getRssChannel().getItems().get(1).setTitle("ab");
            rssRoot.getRssChannel().getItems().get(2).setTitle("a.c");
        }
        return rssRoot;
    }

    @Override
    protected SearchResultItem createSearchResultItem(NewznabXmlItem item) throws NzbHydraException {
        SearchResultItem resultItem = super.createSearchResultItem(item);
        return resultItem;
    }

    @Component
    @Order(500)
    public static class DevIndexerHandlingStrategy implements IndexerHandlingStrategy<DevIndexer> {

        @Override
        public boolean handlesIndexerConfig(IndexerConfig config) {
            return config.getSearchModuleType() == SearchModuleType.DEVONLY;
        }

        @Override
        public String getName() {
            return "DEVONLY";
        }
    }

}
