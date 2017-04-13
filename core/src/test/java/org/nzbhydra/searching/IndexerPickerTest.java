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
import org.nzbhydra.config.SearchSourceRestriction;
import org.nzbhydra.config.SearchingConfig;
import org.nzbhydra.database.IndexerApiAccessRepository;
import org.nzbhydra.database.IndexerEntity;
import org.nzbhydra.database.IndexerStatusEntity;
import org.nzbhydra.database.NzbDownloadRepository;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.mediainfo.InfoProvider.IdType;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.springframework.data.domain.PageImpl;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoField;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static junit.framework.TestCase.assertEquals;
import static junit.framework.TestCase.assertFalse;
import static junit.framework.TestCase.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class IndexerPickerTest {

    @Mock
    private IndexerApiAccessRepository indexerApiAccessRepository;
    @Mock
    private NzbDownloadRepository nzbDownloadRepository;
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
    private IndexerConfig indexerConfigMock;
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
        when(indexer.getConfig()).thenReturn(indexerConfigMock);
        when(indexer.getName()).thenReturn("indexer");
        when(indexer.getIndexerEntity()).thenReturn(indexerEntity);
        when(indexerEntity.getStatus()).thenReturn(indexerStatusEntity);
        when(baseConfig.getSearching()).thenReturn(searchingConfig);
        when(category.getName()).thenReturn("category");
    }

    @Test
    public void shouldCheckIfSelectedByUser() {
        when(searchModuleProviderMock.getIndexers()).thenReturn(Arrays.asList(indexer));
        when(searchRequest.getSource()).thenReturn(SearchSource.INTERNAL);
        when(searchRequest.getIndexers()).thenReturn(Optional.of(Sets.newSet("anotherIndexer")));

        assertFalse(testee.checkIndexerSelectedByUser(searchRequest, count, indexer));

        when(searchRequest.getSource()).thenReturn(SearchSource.API);
        assertTrue(testee.checkIndexerSelectedByUser(searchRequest, count, indexer));


        when(searchRequest.getIndexers()).thenReturn(Optional.of(Sets.newSet("indexer")));

        when(searchRequest.getSource()).thenReturn(SearchSource.INTERNAL);
        assertTrue(testee.checkIndexerSelectedByUser(searchRequest, count, indexer));

        when(searchRequest.getSource()).thenReturn(SearchSource.API);
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
        when(indexerConfigMock.getCategories()).thenReturn(Collections.emptyList());

        assertTrue(testee.checkDisabledForCategory(searchRequest, count, indexer));

        when(indexerConfigMock.getCategories()).thenReturn(Arrays.asList("anotherCategory"));
        assertFalse(testee.checkDisabledForCategory(searchRequest, count, indexer));

        when(indexerConfigMock.getCategories()).thenReturn(Arrays.asList(("category")));
        assertTrue(testee.checkDisabledForCategory(searchRequest, count, indexer));
    }

    @Test
    public void shouldCheckForLoadLimiting() {
        when(indexerConfigMock.getLoadLimitOnRandom()).thenReturn(Optional.empty());
        assertTrue(testee.checkLoadLimiting(count, indexer));

        when(indexerConfigMock.getLoadLimitOnRandom()).thenReturn(Optional.of(1));
        for (int i = 0; i < 50; i++) {
            assertTrue(testee.checkLoadLimiting(count, indexer));
        }

        when(indexerConfigMock.getLoadLimitOnRandom()).thenReturn(Optional.of(2));
        int countNotPicked = 0;
        for (int i = 0; i < 500; i++) {
            countNotPicked += testee.checkLoadLimiting(count, indexer) ? 0 : 1;
        }
        assertTrue(countNotPicked > 0);
    }

    @Test
    public void shouldCheckContext() {
        when(searchModuleProviderMock.getIndexers()).thenReturn(Arrays.asList(indexer));
        when(searchRequest.getSource()).thenReturn(SearchSource.INTERNAL);
        when(indexerConfigMock.getEnabledForSearchSource()).thenReturn(SearchSourceRestriction.API);

        assertFalse(testee.checkSearchSource(searchRequest, count, indexer));

        when(searchRequest.getSource()).thenReturn(SearchSource.API);
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
        provided = new HashSet<>();
        when(searchRequest.getQuery()).thenReturn(Optional.empty());
        verify(infoProviderMock, never()).canConvertAny(provided, supported);
        assertTrue(testee.checkSearchId(searchRequest, count, indexer));
    }

    @Test
    public void shouldIgnoreHitAndDownloadLimitIfNoneAreSet() {
        when(indexerConfigMock.getHitLimit()).thenReturn(Optional.empty());
        when(indexerConfigMock.getDownloadLimit()).thenReturn(Optional.empty());
        testee.checkIndexerHitLimit(count, indexer);
        verify(nzbDownloadRepository, never()).findByIndexerOrderByTimeDesc(any(), any());
        verify(indexerApiAccessRepository, never()).findByIndexerOrderByTimeDesc(any(), any());
    }

    @Test
    public void shouldIgnoreHitLimitIfNotYetReached() {
        when(indexerConfigMock.getHitLimit()).thenReturn(Optional.of(10));
        when(indexerApiAccessRepository.findByIndexerOrderByTimeDesc(any(), any())).thenReturn(new PageImpl<>(Collections.emptyList()));
        boolean result = testee.checkIndexerHitLimit(count, indexer);
        assertTrue(result);
        verify(indexerApiAccessRepository).findByIndexerOrderByTimeDesc(any(), any());
    }

    @Test
    public void shouldIgnoreDownloadLimitIfNotYetReached() {
        when(indexerConfigMock.getDownloadLimit()).thenReturn(Optional.of(10));
        when(nzbDownloadRepository.findByIndexerOrderByTimeDesc(any(), any())).thenReturn(new PageImpl<>(Collections.emptyList()));
        boolean result = testee.checkIndexerHitLimit(count, indexer);
        assertTrue(result);
        verify(nzbDownloadRepository).findByIndexerOrderByTimeDesc(any(), any());
    }

    @Test
    public void shouldCalculateNextHitWithRollingTimeWindows() throws Exception {
        indexerConfigMock.setHitLimitResetTime(null);
        Instant firstInWindow = Instant.now().minus(12, ChronoUnit.HOURS);
        LocalDateTime nextHit = testee.calculateNextPossibleHit(indexerConfigMock, firstInWindow);
        assertEquals(LocalDateTime.ofInstant(firstInWindow, ZoneOffset.UTC).plus(24, ChronoUnit.HOURS), nextHit);
    }

    @Test
    public void shouldCalculateNextHitWithFixedResetTime() throws Exception {
        //Time is in past
        Instant base;
        if (LocalDateTime.now().get(ChronoField.HOUR_OF_DAY) < 12) {
            indexerConfigMock.setHitLimitResetTime(14);
            base = LocalDateTime.now().minus(1, ChronoUnit.DAYS).with(ChronoField.HOUR_OF_DAY, 23).toInstant(ZoneOffset.UTC);
        } else {
            indexerConfigMock.setHitLimitResetTime(10);
            base = LocalDateTime.now().with(ChronoField.HOUR_OF_DAY, 9).toInstant(ZoneOffset.UTC);
        }
        Instant firstInWindow = base;
        LocalDateTime nextHit = testee.calculateNextPossibleHit(indexerConfigMock, firstInWindow);
        //24 hours after the last hit
        assertEquals(LocalDateTime.ofInstant(firstInWindow, ZoneOffset.UTC).plus(1, ChronoUnit.DAYS), nextHit);

        //Time is in future
        if (LocalDateTime.now().get(ChronoField.HOUR_OF_DAY) < 12) {
            indexerConfigMock.setHitLimitResetTime(14);
            base = LocalDateTime.now().plus(1, ChronoUnit.DAYS).with(ChronoField.HOUR_OF_DAY, 23).toInstant(ZoneOffset.UTC);
        } else {
            indexerConfigMock.setHitLimitResetTime(10);
            base = LocalDateTime.now().with(ChronoField.HOUR_OF_DAY, 9).toInstant(ZoneOffset.UTC);
        }
        firstInWindow = base;
        nextHit = testee.calculateNextPossibleHit(indexerConfigMock, firstInWindow);
        //24 hours after the last hit
        assertEquals(LocalDateTime.ofInstant(firstInWindow, ZoneOffset.UTC).plus(1, ChronoUnit.DAYS), nextHit);
    }


}