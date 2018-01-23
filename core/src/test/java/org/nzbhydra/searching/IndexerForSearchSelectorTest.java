package org.nzbhydra.searching;

import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.internal.util.collections.Sets;
import org.nzbhydra.config.*;
import org.nzbhydra.config.Category.Subtype;
import org.nzbhydra.downloading.FileDownloadRepository;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.indexers.IndexerApiAccessRepository;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.indexers.IndexerStatusEntity;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.mediainfo.InfoProvider.IdType;
import org.nzbhydra.searching.IndexerForSearchSelector.InnerInstance;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageImpl;

import javax.persistence.EntityManager;
import javax.persistence.Query;
import java.sql.Timestamp;
import java.time.*;
import java.time.temporal.ChronoField;
import java.time.temporal.ChronoUnit;
import java.util.*;

import static junit.framework.TestCase.*;
import static org.hamcrest.CoreMatchers.is;
import static org.junit.Assert.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

public class IndexerForSearchSelectorTest {

    @Mock
    private IndexerApiAccessRepository indexerApiAccessRepository;
    @Mock
    private FileDownloadRepository nzbDownloadRepository;
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
    private ConfigProvider configProvider;
    @Mock
    private SearchingConfig searchingConfig;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @Mock
    private Category category;
    @Mock
    private EntityManager entityManagerMock;
    @Mock
    private Query queryMock;

    private Map<Indexer, String> count;

    @InjectMocks
    private IndexerForSearchSelector outerClass;
    private InnerInstance testee;

    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        count = new HashMap<>();
        when(searchModuleProviderMock.getIndexers()).thenReturn(Arrays.asList(indexer));
        when(configProvider.getBaseConfig()).thenReturn(baseConfig);
        when(indexer.getConfig()).thenReturn(indexerConfigMock);
        when(indexer.getName()).thenReturn("indexer");
        when(indexer.getIndexerEntity()).thenReturn(indexerEntity);
        when(indexerEntity.getStatus()).thenReturn(indexerStatusEntity);
        when(baseConfig.getSearching()).thenReturn(searchingConfig);
        when(category.getName()).thenReturn("category");
        when(category.getSubtype()).thenReturn(Subtype.NONE);
        testee = outerClass.getInnerInstanceInstance(searchRequest);
        when(entityManagerMock.createNativeQuery(anyString())).thenReturn(queryMock);
    }

    @Test
    public void instancesShouldBeDifferent() {
        SearchRequest searchRequest1 = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        InnerInstance instance1 = outerClass.getInnerInstanceInstance(searchRequest1);
        SearchRequest searchRequest2 = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 200);
        InnerInstance instance2 = outerClass.getInnerInstanceInstance(searchRequest2);

        assertThat(instance1.searchRequest, is(searchRequest1));
        assertThat(instance2.searchRequest, is(searchRequest2));

        instance1.notSelectedIndersWithReason.put(indexer, "message");
        assertThat(instance1.notSelectedIndersWithReason.size(), is(1));
        assertThat(instance2.notSelectedIndersWithReason.size(), is(0));
    }

    @Test
    public void shouldCheckIfSelectedByUser() {
        when(searchModuleProviderMock.getIndexers()).thenReturn(Arrays.asList(indexer));
        when(searchRequest.getSource()).thenReturn(SearchSource.INTERNAL);
        when(searchRequest.getIndexers()).thenReturn(Optional.of(Sets.newSet("anotherIndexer")));

        assertFalse(testee.checkIndexerSelectedByUser(indexer));

        when(searchRequest.getSource()).thenReturn(SearchSource.API);
        assertTrue(testee.checkIndexerSelectedByUser(indexer));


        when(searchRequest.getIndexers()).thenReturn(Optional.of(Sets.newSet("indexer")));

        when(searchRequest.getSource()).thenReturn(SearchSource.INTERNAL);
        assertTrue(testee.checkIndexerSelectedByUser(indexer));

        when(searchRequest.getSource()).thenReturn(SearchSource.API);
        assertTrue(testee.checkIndexerSelectedByUser(indexer));
    }

    @Test
    public void shouldCheckTemporarilyDisabled() {
        when(searchingConfig.isIgnoreTemporarilyDisabled()).thenReturn(false);

        when(indexerStatusEntity.getDisabledUntil()).thenReturn(null);
        assertTrue(testee.checkIndexerStatus(indexer));

        when(indexerStatusEntity.getDisabledUntil()).thenReturn(Instant.now().plus(1, ChronoUnit.DAYS));
        assertFalse(testee.checkIndexerStatus(indexer));

        when(indexerStatusEntity.getDisabledUntil()).thenReturn(Instant.now().minus(1, ChronoUnit.DAYS));
        assertTrue(testee.checkIndexerStatus(indexer));

        when(searchingConfig.isIgnoreTemporarilyDisabled()).thenReturn(true);

        when(indexerStatusEntity.getDisabledUntil()).thenReturn(null);
        assertTrue(testee.checkIndexerStatus(indexer));

        when(indexerStatusEntity.getDisabledUntil()).thenReturn(Instant.now().plus(1, ChronoUnit.DAYS));
        assertTrue(testee.checkIndexerStatus(indexer));

        when(indexerStatusEntity.getDisabledUntil()).thenReturn(Instant.now().minus(1, ChronoUnit.DAYS));
        assertTrue(testee.checkIndexerStatus(indexer));

        when(indexerStatusEntity.getDisabledPermanently()).thenReturn(true);
        assertFalse(testee.checkIndexerStatus(indexer));
    }

    @Test
    public void shouldCheckForCategory() {
        when(searchRequest.getCategory()).thenReturn(category);
        when(indexerConfigMock.getEnabledCategories()).thenReturn(Collections.emptyList());

        assertTrue(testee.checkDisabledForCategory(indexer));

        when(indexerConfigMock.getEnabledCategories()).thenReturn(Arrays.asList("anotherCategory"));
        assertFalse(testee.checkDisabledForCategory(indexer));

        when(indexerConfigMock.getEnabledCategories()).thenReturn(Arrays.asList(("category")));
        assertTrue(testee.checkDisabledForCategory(indexer));
    }

    @Test
    public void shouldCheckForLoadLimiting() {
        when(indexerConfigMock.getLoadLimitOnRandom()).thenReturn(Optional.empty());
        assertTrue(testee.checkLoadLimiting(indexer));

        when(indexerConfigMock.getLoadLimitOnRandom()).thenReturn(Optional.of(1));
        for (int i = 0; i < 50; i++) {
            assertTrue(testee.checkLoadLimiting(indexer));
        }

        when(indexerConfigMock.getLoadLimitOnRandom()).thenReturn(Optional.of(2));
        int countNotPicked = 0;
        for (int i = 0; i < 500; i++) {
            countNotPicked += testee.checkLoadLimiting(indexer) ? 0 : 1;
        }
        assertTrue(countNotPicked > 0);
    }

    @Test
    public void shouldCheckContext() {
        when(searchModuleProviderMock.getIndexers()).thenReturn(Arrays.asList(indexer));
        when(searchRequest.getSource()).thenReturn(SearchSource.INTERNAL);
        when(indexerConfigMock.getEnabledForSearchSource()).thenReturn(SearchSourceRestriction.API);

        assertFalse(testee.checkSearchSource(indexer));

        when(searchRequest.getSource()).thenReturn(SearchSource.API);
        assertTrue(testee.checkSearchSource(indexer));
    }

    @Test
    public void shouldCheckIdConversion() {
        Set<IdType> supported = Sets.newSet(IdType.TVMAZE, IdType.TVDB);
        Set<IdType> provided = Sets.newSet(IdType.TVMAZE);

        when(searchRequest.getQuery()).thenReturn(Optional.empty());
        when(infoProviderMock.canConvertAny(provided, supported)).thenReturn(true);
        assertTrue(testee.checkSearchId(indexer));

        //Search ID doesn't matter if a query is provided
        when(searchRequest.getQuery()).thenReturn(Optional.of("a query"));
        when(infoProviderMock.canConvertAny(provided, supported)).thenReturn(false);
        assertTrue(testee.checkSearchId(indexer));

        //When no IDs are provided and no query is provided the ID check should be successful (might be an update query)
        provided = new HashSet<>();
        when(searchRequest.getQuery()).thenReturn(Optional.empty());
        verify(infoProviderMock, never()).canConvertAny(provided, supported);
        assertTrue(testee.checkSearchId(indexer));
    }

    @Test
    public void shouldIgnoreHitAndDownloadLimitIfNoneAreSet() {
        when(indexerConfigMock.getHitLimit()).thenReturn(Optional.empty());
        when(indexerConfigMock.getDownloadLimit()).thenReturn(Optional.empty());
        testee.checkIndexerHitLimit(indexer);
        verify(nzbDownloadRepository, never()).findBySearchResultIndexerOrderByTimeDesc(any(), any());
        verify(indexerApiAccessRepository, never()).findByIndexerOrderByTimeDesc(any(), any());
    }

    @Test
    public void shouldIgnoreHitLimitIfNotYetReached() {
        when(indexerConfigMock.getHitLimit()).thenReturn(Optional.of(10));
        when(queryMock.getResultList()).thenReturn(Collections.emptyList());
        boolean result = testee.checkIndexerHitLimit(indexer);
        assertTrue(result);
        verify(entityManagerMock).createNativeQuery(anyString());
    }

    @Test
    public void shouldFollowApiHitLimit() {
        when(indexerConfigMock.getHitLimit()).thenReturn(Optional.of(1));
        when(queryMock.getResultList()).thenReturn(Arrays.asList(Timestamp.from(Instant.now().minus(10, ChronoUnit.MILLIS))));
        boolean result = testee.checkIndexerHitLimit(indexer);
        assertFalse(result);
        verify(entityManagerMock).createNativeQuery(anyString());
    }

    @Test
    public void shouldIgnoreDownloadLimitIfNotYetReached() {
        when(indexerConfigMock.getDownloadLimit()).thenReturn(Optional.of(10));
        when(nzbDownloadRepository.findBySearchResultIndexerOrderByTimeDesc(any(), any())).thenReturn(new PageImpl<>(Collections.emptyList()));
        boolean result = testee.checkIndexerHitLimit(indexer);
        assertTrue(result);
        verify(nzbDownloadRepository).findBySearchResultIndexerOrderByTimeDesc(any(), any());
    }

    @Test
    public void shouldCalculateNextHitWithRollingTimeWindows() throws Exception {
        indexerConfigMock.setHitLimitResetTime(null);
        Instant firstInWindow = Instant.now().minus(12, ChronoUnit.HOURS);
        LocalDateTime nextHit = testee.calculateNextPossibleHit(indexerConfigMock, firstInWindow);
        assertEquals(LocalDateTime.ofInstant(firstInWindow, ZoneOffset.UTC).plus(24, ChronoUnit.HOURS), nextHit);
    }

    @Test
    public void shouldOnlyUseTorznabIndexersForTorrentSearches() throws Exception {
        when(indexerConfigMock.getSearchModuleType()).thenReturn(SearchModuleType.NEWZNAB);
        when(searchRequest.getDownloadType()).thenReturn(DownloadType.TORRENT);
        assertFalse("Only torznab indexers should be used for torrent searches", testee.checkTorznabOnlyUsedForTorrentOrInternalSearches(indexer));

        when(indexerConfigMock.getSearchModuleType()).thenReturn(SearchModuleType.TORZNAB);
        when(searchRequest.getDownloadType()).thenReturn(DownloadType.TORRENT);
        assertTrue("Torznab indexers should be used for torrent searches", testee.checkTorznabOnlyUsedForTorrentOrInternalSearches(indexer));

        when(indexerConfigMock.getSearchModuleType()).thenReturn(SearchModuleType.TORZNAB);
        when(searchRequest.getSource()).thenReturn(SearchSource.INTERNAL);
        when(searchRequest.getDownloadType()).thenReturn(DownloadType.NZB);
        assertTrue("Torznab indexers should be selected for internal NZB searches", testee.checkTorznabOnlyUsedForTorrentOrInternalSearches(indexer));

        when(indexerConfigMock.getSearchModuleType()).thenReturn(SearchModuleType.TORZNAB);
        when(searchRequest.getSource()).thenReturn(SearchSource.API);
        when(searchRequest.getDownloadType()).thenReturn(DownloadType.NZB);
        assertFalse("Torznab indexers should not be selected for API NZB searches", testee.checkTorznabOnlyUsedForTorrentOrInternalSearches(indexer));
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

    @Test
    public void shouldHonorSchedule() throws Exception {
        testee.clock = Clock.fixed(Instant.ofEpochSecond(1512974083), ZoneId.of("UTC")); //Monday, December 11, 2017 6:34:43 AM
        org.assertj.core.api.Assertions.assertThat(testee.isInTime("mo")).isTrue();
        org.assertj.core.api.Assertions.assertThat(testee.isInTime("mo-tu")).isTrue();
        org.assertj.core.api.Assertions.assertThat(testee.isInTime("mo-su")).isTrue();
        org.assertj.core.api.Assertions.assertThat(testee.isInTime("tu-mo")).isTrue();
        org.assertj.core.api.Assertions.assertThat(testee.isInTime("tu")).isFalse();
        org.assertj.core.api.Assertions.assertThat(testee.isInTime("tu-we")).isFalse();

        org.assertj.core.api.Assertions.assertThat(testee.isInTime("mo6")).isTrue();
        org.assertj.core.api.Assertions.assertThat(testee.isInTime("mo6-10")).isTrue();
        org.assertj.core.api.Assertions.assertThat(testee.isInTime("mo6-23")).isTrue();
        org.assertj.core.api.Assertions.assertThat(testee.isInTime("mo1-10")).isTrue();
        org.assertj.core.api.Assertions.assertThat(testee.isInTime("mo1-5")).isFalse();
        org.assertj.core.api.Assertions.assertThat(testee.isInTime("mo7-23")).isFalse();
        org.assertj.core.api.Assertions.assertThat(testee.isInTime("mo22-8")).isTrue();
        org.assertj.core.api.Assertions.assertThat(testee.isInTime("mo22-5")).isFalse();

        org.assertj.core.api.Assertions.assertThat(testee.isInTime("mo-tu6")).isTrue();
        org.assertj.core.api.Assertions.assertThat(testee.isInTime("mo-tu6-10")).isTrue();
        org.assertj.core.api.Assertions.assertThat(testee.isInTime("mo-tu1-2")).isFalse();
        org.assertj.core.api.Assertions.assertThat(testee.isInTime("tu-we6")).isFalse();
        org.assertj.core.api.Assertions.assertThat(testee.isInTime("tu-we6-10")).isFalse();

        org.assertj.core.api.Assertions.assertThat(testee.isInTime("6")).isTrue();
        org.assertj.core.api.Assertions.assertThat(testee.isInTime("6-10")).isTrue();
        org.assertj.core.api.Assertions.assertThat(testee.isInTime("7-10")).isFalse();
        org.assertj.core.api.Assertions.assertThat(testee.isInTime("10-7")).isTrue();

        when(indexerConfigMock.getSchedule()).thenReturn(Arrays.asList("tu-we6", "mo"));
        org.assertj.core.api.Assertions.assertThat(testee.checkSchedule(indexer)).isTrue();

        when(indexerConfigMock.getSchedule()).thenReturn(Arrays.asList("tu-we6"));
        org.assertj.core.api.Assertions.assertThat(testee.checkSchedule(indexer)).isFalse();

        testee.clock = Clock.fixed(Instant.ofEpochSecond(1513412203), ZoneId.of("UTC")); //Saturday, December 16, 2017 8:16:43 AM
        org.assertj.core.api.Assertions.assertThat(testee.isInTime("fr-sa")).isTrue();
        org.assertj.core.api.Assertions.assertThat(testee.isInTime("mo-sa")).isTrue();
    }


}