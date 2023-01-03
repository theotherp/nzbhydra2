package org.nzbhydra.tests.searching;

import com.google.common.base.Charsets;
import com.google.common.io.Resources;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.searching.SearchResult;
import org.nzbhydra.searching.Searcher;
import org.nzbhydra.searching.dtoseventsenums.SearchType;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.nzbhydra.tests.AbstractConfigReplacingTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(SpringExtension.class)
@SpringBootTest(classes = NzbHydra.class)
public class SearchingIntegrationTest extends AbstractConfigReplacingTest {

    @Autowired
    private Searcher searcher;

    private MockWebServer mockWebServer = new MockWebServer();


    @BeforeEach
    public void setUp() throws IOException {
        mockWebServer.start(7070);
        replaceConfig(getClass().getResource("twoIndexers.json"));
    }

    @AfterEach
    public void tearDown() throws IOException {
        mockWebServer.close();
    }


    @Disabled //TODO Adapt to new paging
    @Test
    public void shouldSearch() throws Exception {
        //One indexer has two results, the other one. A request is done with a limit of 2. Both indexers return one result. Another request is done with offset 2, the first indexer returns its second result

        String expectedContent1a = Resources.toString(Resources.getResource(SearchingIntegrationTest.class, "simplesearchresult1a.xml"), Charsets.UTF_8);
        String expectedContent1b = Resources.toString(Resources.getResource(SearchingIntegrationTest.class, "simplesearchresult1b.xml"), Charsets.UTF_8);
        String expectedContent2 = Resources.toString(Resources.getResource(SearchingIntegrationTest.class, "simplesearchresult2.xml"), Charsets.UTF_8);

        mockWebServer.enqueue(new MockResponse().setBody(expectedContent1a).setHeader("Content-Type", "application/xml; charset=utf-8"));
        mockWebServer.enqueue(new MockResponse().setBody(expectedContent2).setHeader("Content-Type", "application/xml; charset=utf-8"));
        mockWebServer.enqueue(new MockResponse().setBody(expectedContent1b).setHeader("Content-Type", "application/xml; charset=utf-8"));


        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 2);
        SearchResult searchResult = searcher.search(searchRequest);

        assertThat(searchResult.getSearchResultItems().size()).isEqualTo(2);

        searchRequest.setLimit(100);
        searchRequest.setOffset(2);

        searchResult = searcher.search(searchRequest);

        assertThat(searchResult.getSearchResultItems().size()).isEqualTo(1);
        assertThat(searchResult.getSearchResultItems().get(0).getTitle()).isEqualTo("itemTitle1b");
    }

}
