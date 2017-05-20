package org.nzbhydra.api;

import com.google.common.collect.HashMultiset;
import org.junit.Before;
import org.junit.Test;
import org.mockito.Mock;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.searching.DuplicateDetectionResult;
import org.nzbhydra.searching.SearchResult;
import org.nzbhydra.searching.SearchResultItem;
import org.springframework.boot.test.mock.mockito.MockBean;

import java.time.Instant;
import java.util.Collections;
import java.util.TreeSet;

import static org.mockito.Mockito.when;


public class ExternalApiTest {

    BaseConfig baseConfig = new BaseConfig();

    @MockBean
    private ExternalApi testee = new ExternalApi();

    @Mock
    private ConfigProvider configProviderMock;


    @Before
    public void setUp() {
        when(configProviderMock.getBaseConfig()).thenReturn(baseConfig);
    }

    @Test
    public void shouldPickResultsByScoreAndAge() {
        SearchResult result = new SearchResult();

        TreeSet<SearchResultItem> itemSet = new TreeSet<>();

        SearchResultItem item1 = new SearchResultItem();
        item1.setIndexerScore(2);
        item1.setPubDate(Instant.ofEpochMilli(1000));
        item1.setTitle("item1");
        itemSet.add(item1);

        SearchResultItem item2 = new SearchResultItem();
        item2.setIndexerScore(5);
        item2.setPubDate(Instant.ofEpochMilli(3000));
        item2.setTitle("item2");
        itemSet.add(item2);

        SearchResultItem item3 = new SearchResultItem();
        item3.setIndexerScore(5);
        item3.setPubDate(Instant.ofEpochMilli(4000));
        item3.setTitle("item3");
        itemSet.add(item3);

        SearchResultItem item4 = new SearchResultItem();
        item4.setIndexerScore(3);
        item4.setPubDate(Instant.ofEpochMilli(5000));
        item4.setTitle("item4");
        itemSet.add(item4);


        DuplicateDetectionResult detectionResult = new DuplicateDetectionResult(Collections.singletonList(itemSet), HashMultiset.create());
        //TODO Move to searcher
        //result.setDuplicateDetectionResult(detectionResult);

//        List<SearchResultItem> items = testee.pickSearchResultItemsFromDuplicateGroups(result);
//        assertThat(items.size(), is(1));
//        assertThat("Should've picked the result with the highest score, then the newest", items.get(0).getTitle(), is("item3"));
    }

}