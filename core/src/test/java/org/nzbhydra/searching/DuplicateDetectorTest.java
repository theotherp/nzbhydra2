package org.nzbhydra.searching;

import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.config.SearchingConfig;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.indexers.Newznab;
import org.nzbhydra.searching.dtoseventsenums.DuplicateDetectionResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

public class DuplicateDetectorTest {
    @InjectMocks
    private DuplicateDetector testee = new DuplicateDetector();
    @Mock
    private ConfigProvider configProviderMock;


    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        BaseConfig baseConfig = new BaseConfig();
        baseConfig.setSearching(new SearchingConfig());
        baseConfig.getSearching().setDuplicateSizeThresholdInPercent(1F);
        baseConfig.getSearching().setDuplicateAgeThreshold(2F);
        when(configProviderMock.getBaseConfig()).thenReturn(baseConfig);
    }

    @Test
    public void shouldDetectThatTheSame() throws Exception {
        SearchResultItem item1 = new SearchResultItem();
        setValues(item1, "1", "poster", "group", Instant.now());
        SearchResultItem item2 = new SearchResultItem();
        setValues(item2, "2", "poster", "group", Instant.now());
        SearchResultItem item3 = new SearchResultItem();
        setValues(item3, "3", "poster", "group", Instant.now());

        DuplicateDetectionResult result = testee.detectDuplicates(Arrays.asList(item1, item2, item3));
        assertThat(result.getDuplicateGroups().size()).isEqualTo(1);

        List<SearchResultItem> items = new ArrayList<>(result.getDuplicateGroups().get(0));

        assertThat(items.get(0).getDuplicateIdentifier()).isEqualTo(items.get(1).getDuplicateIdentifier()).isEqualTo(items.get(2).getDuplicateIdentifier());
    }

    @Test
    public void shouldWorkWithOneIndexerProvidingGroupAndPosterAndOneNot() throws Exception {
        SearchResultItem item1 = new SearchResultItem();
        setValues(item1, "Indexer1", "chuck@norris.com", "alt.binaries.triballs", Instant.ofEpochSecond(1447928064));
        item1.setUsenetDate(item1.getPubDate());
        item1.setSize(11565521038L);
        SearchResultItem item2 = new SearchResultItem();
        setValues(item2, "Indexer1", "moovee@4u.tv (moovee)", "alt.binaries.moovee", Instant.ofEpochSecond(1447930279));
        item2.setUsenetDate(item2.getPubDate());
        item2.setSize(12100381412L);
        SearchResultItem item3 = new SearchResultItem();
        setValues(item3, "Indexer1", "chuck@norris.com", "alt.binaries.triballs", Instant.ofEpochSecond(1447927640));
        item3.setUsenetDate(item3.getPubDate());
        item3.setSize(11565520866L);
        SearchResultItem item4 = new SearchResultItem();
        setValues(item4, "Indexer1", "moovee@4u.tv (moovee)", "alt.binaries.moovee", Instant.ofEpochSecond(1447930279));
        item4.setUsenetDate(item4.getPubDate());
        item4.setSize(12100382514L);

        SearchResultItem item5 = new SearchResultItem();
        setValues(item5, "Indexer2", null, null, Instant.ofEpochSecond(1447973616));
        item5.setSize(12096598793L);
        SearchResultItem item6 = new SearchResultItem();
        setValues(item6, "Indexer2", null, null, Instant.ofEpochSecond(1447945386));
        item6.setSize(12078310717L);
        SearchResultItem item7 = new SearchResultItem();
        setValues(item7, "Indexer2", null, null, Instant.ofEpochSecond(1447930475));
        item7.setSize(12099830939L);
        SearchResultItem item8 = new SearchResultItem();
        setValues(item8, "Indexer2", null, null, Instant.ofEpochSecond(1447928088));
        item8.setSize(11566348892L);

        DuplicateDetectionResult result = testee.detectDuplicates(Arrays.asList(item1, item2, item3, item4, item5, item6, item7, item8));
        assertThat(result.getDuplicateGroups().size()).isEqualTo(6);
        assertThat(result.getDuplicateGroups().get(0).size()).isEqualTo(1);
        assertThat(result.getDuplicateGroups().get(1).size()).isEqualTo(1);
        assertThat(result.getDuplicateGroups().get(2).size()).isEqualTo(2);
        assertThat(result.getDuplicateGroups().get(3).size()).isEqualTo(1);
        assertThat(result.getDuplicateGroups().get(4).size()).isEqualTo(2);
        assertThat(result.getDuplicateGroups().get(5).size()).isEqualTo(1);
    }


    @Test
    public void duplicateIdsShouldBeSameForDuplicates() throws Exception {
        SearchResultItem item1 = new SearchResultItem();
        setValues(item1, "1", "poster1", "group", Instant.now());
        SearchResultItem item2 = new SearchResultItem();
        setValues(item2, "2", "poster1", "group", Instant.now());
        SearchResultItem item3 = new SearchResultItem();
        setValues(item3, "3", "poster2", "group", Instant.now());
        SearchResultItem item4 = new SearchResultItem();
        setValues(item4, "4", "poster2", "group", Instant.now());

        DuplicateDetectionResult result = testee.detectDuplicates(Arrays.asList(item1, item2, item3, item4));
        assertThat(result.getDuplicateGroups().size()).isEqualTo(2);

        List<SearchResultItem> items = new ArrayList<>(result.getDuplicateGroups().get(0));
        assertThat(items.get(0).getDuplicateIdentifier()).isEqualTo(items.get(1).getDuplicateIdentifier()).as("Duplicates should have the same duplicate identifiers");
        items = new ArrayList<>(result.getDuplicateGroups().get(1));
        assertThat(items.get(0).getDuplicateIdentifier()).isEqualTo(items.get(1).getDuplicateIdentifier()).as("Duplicates should have the same duplicate identifiers");
    }

    @Test
    public void shouldUseUsenetDateForComparison() throws Exception {
        SearchResultItem item1 = new SearchResultItem();
        setValues(item1, "1", "poster1", "group", Instant.now());
        item1.setPubDate(Instant.now().minus(100, ChronoUnit.DAYS));
        SearchResultItem item2 = new SearchResultItem();
        setValues(item2, "2", "poster1", "group", Instant.now());
        item2.setPubDate(Instant.now().minus(300, ChronoUnit.DAYS));

        item1.setUsenetDate(Instant.now());
        item2.setUsenetDate(Instant.now());
        assertThat(testee.testForDuplicateAge(item1, item2, 1F)).isTrue();

        item2.setUsenetDate(null);
        assertThat(testee.testForDuplicateAge(item1, item2, 1F)).isFalse();
    }


    protected void setValues(SearchResultItem item, String indexerName, String poster, String group, Instant pubDate) {
        item.setAgePrecise(true);
        item.setTitle("title");
        item.setIndexerGuid("123");
        item.setPubDate(pubDate);
        item.setPoster(poster);
        item.setGroup(group);
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