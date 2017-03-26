package org.nzbhydra.searching;

import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.internal.util.collections.Sets;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.Category;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.config.IndexerConfig.SourceEnabled;
import org.nzbhydra.config.SearchingConfig;
import org.nzbhydra.database.IndexerEntity;
import org.nzbhydra.database.IndexerStatusEntity;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.mediainfo.InfoProvider.IdType;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchRequest.AccessSource;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

import static junit.framework.TestCase.assertFalse;
import static junit.framework.TestCase.assertTrue;
import static org.mockito.Mockito.*;

public class IndexerPickerTest {

    @Mock
    private SearchModuleProvider searchModuleProviderMock;
    @Mock
    private Indexer indexer;
    @Mock
    private IndexerEntity indexerEntity;
    @Mock
    private IndexerStatusEntity indexerStatusEntity;
    @Mock
    private InfoProvider infoProviderMock;
    @Mock
    private SearchRequest searchRequest;
    @Mock
    private IndexerConfig indexerConfig;
    @Mock
    private BaseConfig baseConfig;
    @Mock
    private SearchingConfig searchingConfig;
    @Mock
    private Category category;

    private Map<Indexer, String> count;

    @InjectMocks
    private IndexerPicker testee = new IndexerPicker();

    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        count = new HashMap<>();
        when(searchModuleProviderMock.getIndexers()).thenReturn(Arrays.asList(indexer));
        when(indexer.getConfig()).thenReturn(indexerConfig);
        when(indexer.getName()).thenReturn("indexer");
        when(indexer.getIndexerEntity()).thenReturn(indexerEntity);
        when(indexerEntity.getStatus()).thenReturn(indexerStatusEntity);
        when(baseConfig.getSearching()).thenReturn(searchingConfig);
        when(category.getName()).thenReturn("category");
    }

    @Test
    public void shouldCheckIfSelectedByUser() {
        when(searchModuleProviderMock.getIndexers()).thenReturn(Arrays.asList(indexer));
        when(searchRequest.getSource()).thenReturn(AccessSource.INTERNAL);
        when(searchRequest.getIndexers()).thenReturn(Optional.of(Arrays.asList("anotherIndexer")));

        assertFalse(testee.checkIndexerSelectedByUser(searchRequest, count, indexer));

        when(searchRequest.getSource()).thenReturn(AccessSource.API);
        assertTrue(testee.checkIndexerSelectedByUser(searchRequest, count, indexer));


        when(searchRequest.getIndexers()).thenReturn(Optional.of(Arrays.asList("indexer")));

        when(searchRequest.getSource()).thenReturn(AccessSource.INTERNAL);
        assertTrue(testee.checkIndexerSelectedByUser(searchRequest, count, indexer));

        when(searchRequest.getSource()).thenReturn(AccessSource.API);
        assertTrue(testee.checkIndexerSelectedByUser(searchRequest, count, indexer));
    }

    @Test
    public void shouldCheckTemporarilyDisabled() {
        when(searchingConfig.isIgnoreTemporarilyDisabled()).thenReturn(false);

        when(indexerStatusEntity.getDisabledUntil()).thenReturn(null);
        assertTrue(testee.checkIndexerStatus(count, indexer));

        when(indexerStatusEntity.getDisabledUntil()).thenReturn(Instant.now().plus(1, ChronoUnit.DAYS));
        assertFalse(testee.checkIndexerStatus(count, indexer));

        when(indexerStatusEntity.getDisabledUntil()).thenReturn(Instant.now().minus(1, ChronoUnit.DAYS));
        assertTrue(testee.checkIndexerStatus(count, indexer));

        when(searchingConfig.isIgnoreTemporarilyDisabled()).thenReturn(true);

        when(indexerStatusEntity.getDisabledUntil()).thenReturn(null);
        assertTrue(testee.checkIndexerStatus(count, indexer));

        when(indexerStatusEntity.getDisabledUntil()).thenReturn(Instant.now().plus(1, ChronoUnit.DAYS));
        assertTrue(testee.checkIndexerStatus(count, indexer));

        when(indexerStatusEntity.getDisabledUntil()).thenReturn(Instant.now().minus(1, ChronoUnit.DAYS));
        assertTrue(testee.checkIndexerStatus(count, indexer));

        when(indexerStatusEntity.getDisabledPermanently()).thenReturn(true);
        assertFalse(testee.checkIndexerStatus(count, indexer));
    }

    @Test
    public void shouldCheckForCategory() {
        when(searchRequest.getCategory()).thenReturn(category);
        when(indexerConfig.getCategories()).thenReturn(Collections.emptySet());

        assertTrue(testee.checkDisabledForCategory(searchRequest, count, indexer));

        when(indexerConfig.getCategories()).thenReturn(Sets.newSet("anotherCategory"));
        assertFalse(testee.checkDisabledForCategory(searchRequest, count, indexer));

        when(indexerConfig.getCategories()).thenReturn(Sets.newSet(("category")));
        assertTrue(testee.checkDisabledForCategory(searchRequest, count, indexer));
    }

    @Test
    public void shouldCheckForLoadLimiting() {
        when(indexerConfig.getLoadLimitOnRandom()).thenReturn(Optional.empty());
        assertTrue(testee.checkLoadLimiting(count, indexer));

        when(indexerConfig.getLoadLimitOnRandom()).thenReturn(Optional.of(1));
        for (int i = 0; i < 50; i++) {
            assertTrue(testee.checkLoadLimiting(count, indexer));
        }

        when(indexerConfig.getLoadLimitOnRandom()).thenReturn(Optional.of(2));
        int countNotPicked = 0;
        for (int i = 0; i < 500; i++) {
            countNotPicked += testee.checkLoadLimiting(count, indexer) ? 0 : 1;
        }
        assertTrue(countNotPicked > 0);
    }

    @Test
    public void shouldCheckContext() {
        when(searchModuleProviderMock.getIndexers()).thenReturn(Arrays.asList(indexer));
        when(searchRequest.getSource()).thenReturn(AccessSource.INTERNAL);
        when(indexerConfig.getEnabledForSearchSource()).thenReturn(SourceEnabled.API);

        assertFalse(testee.checkSearchSource(searchRequest, count, indexer));

        when(searchRequest.getSource()).thenReturn(AccessSource.API);
        assertTrue(testee.checkSearchSource(searchRequest, count, indexer));
    }

    @Test
    public void shouldCheckIdConversion() {
        Set<IdType> supported = Sets.newSet(IdType.TVMAZE, IdType.TVDB);
        Set<IdType> provided = Sets.newSet(IdType.TVMAZE);

        when(searchRequest.getQuery()).thenReturn(Optional.empty());
        when(infoProviderMock.canConvertAny(provided, supported)).thenReturn(true);
        assertTrue(testee.checkSearchId(searchRequest, count, indexer));

        //Search ID doesn't matter if a query is provided
        when(searchRequest.getQuery()).thenReturn(Optional.of("a query"));
        when(infoProviderMock.canConvertAny(provided, supported)).thenReturn(false);
        assertTrue(testee.checkSearchId(searchRequest, count, indexer));

        //When no IDs are provided and no query is provided the ID check should be successful (might be an update query)
        provided = Sets.newSet();
        when(searchRequest.getQuery()).thenReturn(Optional.empty());
        verify(infoProviderMock, never()).canConvertAny(provided, supported);
        assertTrue(testee.checkSearchId(searchRequest, count, indexer));
    }


}