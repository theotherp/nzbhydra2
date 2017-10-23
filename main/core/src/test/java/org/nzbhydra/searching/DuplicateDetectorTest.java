package org.nzbhydra.searching;

import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.config.SearchingConfig;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.indexers.Newznab;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

public class DuplicateDetectorTest {
    @InjectMocks
    private DuplicateDetector testee = new DuplicateDetector();
    
    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        testee.searchingConfig = new SearchingConfig();
    }

    @Test
    public void detectDuplicates() throws Exception {
        SearchResultItem item1 = new SearchResultItem();
        setValues(item1, "1");
        SearchResultItem item2 = new SearchResultItem();
        setValues(item2, "2");
        SearchResultItem item3 = new SearchResultItem();
        setValues(item3, "3");

        DuplicateDetectionResult result = testee.detectDuplicates(Arrays.asList(item1, item2, item3));
        assertThat(result.getDuplicateGroups().size()).isEqualTo(1);

        List<SearchResultItem> items = new ArrayList<>(result.getDuplicateGroups().get(0));

        assertThat(items.get(0).getDuplicateIdentifier()).isEqualTo(items.get(1).getDuplicateIdentifier()).isEqualTo(items.get(2).getDuplicateIdentifier());
    }

    protected void setValues(SearchResultItem item, String indexerName) {
        item.setAgePrecise(true);
        item.setTitle("title");
        item.setIndexerGuid("123");
        item.setPubDate(Instant.now());
        item.setPoster("poster");
        item.setGroup("group");
        item.setSize(10000L);
        Newznab indexer = new Newznab();
        IndexerConfig config = new IndexerConfig();
        config.setName(indexerName);
        IndexerEntity indexerEntity = new IndexerEntity();
        indexerEntity.setName(indexerName);
        indexer.initialize(config, indexerEntity);
        item.setIndexer(indexer);
    }


}