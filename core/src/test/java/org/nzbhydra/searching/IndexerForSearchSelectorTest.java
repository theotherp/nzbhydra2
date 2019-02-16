package org.nzbhydra.searching;

import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.internal.util.collections.Sets;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.SearchSourceRestriction;
import org.nzbhydra.config.SearchingConfig;
import org.nzbhydra.config.category.Category;
import org.nzbhydra.config.category.Category.Subtype;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.IndexerState;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.downloading.FileDownloadRepository;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.indexers.IndexerApiAccessRepository;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.mediainfo.InfoProvider.IdType;
import org.nzbhydra.searching.dtoseventsenums.DownloadType;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.springframework.context.ApplicationEventPublisher;

import javax.persistence.EntityManager;
import javax.persistence.Query;
import java.sql.Timestamp;
import java.time.*;
import java.time.temporal.ChronoField;
import java.time.temporal.ChronoUnit;
import java.util.*;

import static junit.framework.TestCase.*;
import static org.assertj.core.api.Assertions.assertThat;
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
    private InfoProvider infoProviderMock;
    @Mock
    private SearchRequest searchRequest;
    private IndexerConfig indexerConfigMock = new IndexerConfig();
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
    private IndexerForSearchSelector testee;

    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        count = new HashMap<>();
        when(searchModuleProviderMock.getIndexers()).thenReturn(Arrays.asList(indexer));
        when(configProvider.getBaseConfig()).thenReturn(baseConfig);
        when(indexer.getConfig()).thenReturn(indexerConfigMock);
        when(indexer.getName()).thenReturn("indexer");
        when(indexer.getIndexerEntity()).thenReturn(indexerEntity);
        when(baseConfig.getSearching()).thenReturn(searchingConfig);
        when(category.getName()).thenReturn("category");
        when(category.getSubtype()).thenReturn(Subtype.NONE);
        when(entityManagerMock.createNativeQuery(anyString())).thenReturn(queryMock);
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
    public void shouldCheckIfDisabledBySystem() {
        when(searchingConfig.isIgnoreTemporarilyDisabled()).thenReturn(false);

        when(indexerEntity.getState()).thenReturn(IndexerState.ENABLED);
        indexerEntity.setDisabledUntil(null);
        assertTrue(testee.checkIndexerStatus(indexer));

        when(indexerEntity.getState()).thenReturn(IndexerState.DISABLED_SYSTEM_TEMPORARY);
        when(indexerEntity.getDisabledUntil()).thenReturn(Instant.now().plus(1, ChronoUnit.DAYS));
        assertFalse(testee.checkIndexerStatus(indexer));

        when(indexerEntity.getState()).thenReturn(IndexerState.DISABLED_SYSTEM);
        assertFalse(testee.checkIndexerStatus(indexer));
    }

    @Test
    public void shouldCheckForCategory() {
        when(searchRequest.getCategory()).thenReturn(category);
        indexerConfigMock.setEnabledCategories(Collections.emptyList());

        assertTrue(testee.checkDisabledForCategory(indexer));

        indexerConfigMock.setEnabledCategories(Arrays.asList("anotherCategory"));
        assertFalse(testee.checkDisabledForCategory(indexer));

        indexerConfigMock.setEnabledCategories(Arrays.asList(("category")));
        assertTrue(testee.checkDisabledForCategory(indexer));
    }

    @Test
    public void shouldCheckForLoadLimiting() {
        indexerConfigMock.setLoadLimitOnRandom(null);
        assertTrue(testee.checkLoadLimiting(indexer));

        indexerConfigMock.setLoadLimitOnRandom(1);
        for (int i = 0; i < 50; i++) {
            assertTrue(testee.checkLoadLimiting(indexer));
        }

        indexerConfigMock.setLoadLimitOnRandom(2);
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
        indexerConfigMock.setEnabledForSearchSource(SearchSourceRestriction.API);

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

        indexerConfigMock.setHitLimit(null);
        indexerConfigMock.setDownloadLimit(null);
        testee.checkIndexerHitLimit(indexer);
        verify(nzbDownloadRepository, never()).findBySearchResultIndexerOrderByTimeDesc(any(), any());
        verify(indexerApiAccessRepository, never()).findByIndexerOrderByTimeDesc(any(), any());
    }

    @Test
    public void shouldIgnoreHitLimitIfNotYetReached() {
        indexerConfigMock.setHitLimit(10);
        when(queryMock.getResultList()).thenReturn(Collections.emptyList());
        boolean result = testee.checkIndexerHitLimit(indexer);
        assertTrue(result);
        verify(entityManagerMock).createNativeQuery(anyString());
    }

    @Test
    public void shouldFollowApiHitLimit() {
        indexerConfigMock.setHitLimit(1);
        when(queryMock.getResultList()).thenReturn(Arrays.asList(Timestamp.from(Instant.now().minus(10, ChronoUnit.MILLIS))));
        boolean result = testee.checkIndexerHitLimit(indexer);
        assertFalse(result);
        verify(entityManagerMock).createNativeQuery(anyString());
    }

    @Test
    public void shouldIgnoreDownloadLimitIfNotYetReached() {
        indexerConfigMock.setDownloadLimit(10);
        when(queryMock.getResultList()).thenReturn(Arrays.asList(Timestamp.from(Instant.now().minus(10, ChronoUnit.MILLIS))));
        boolean result = testee.checkIndexerHitLimit(indexer);
        assertTrue(result);
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
        indexerConfigMock.setSearchModuleType(SearchModuleType.NEWZNAB);
        when(searchRequest.getDownloadType()).thenReturn(org.nzbhydra.searching.dtoseventsenums.DownloadType.TORRENT);
        assertFalse("Only torznab indexers should be used for torrent searches", testee.checkTorznabOnlyUsedForTorrentOrInternalSearches(indexer));

        indexerConfigMock.setSearchModuleType(SearchModuleType.TORZNAB);
        when(searchRequest.getDownloadType()).thenReturn(org.nzbhydra.searching.dtoseventsenums.DownloadType.TORRENT);
        assertTrue("Torznab indexers should be used for torrent searches", testee.checkTorznabOnlyUsedForTorrentOrInternalSearches(indexer));

        indexerConfigMock.setSearchModuleType(SearchModuleType.TORZNAB);
        when(searchRequest.getSource()).thenReturn(SearchSource.INTERNAL);
        when(searchRequest.getDownloadType()).thenReturn(org.nzbhydra.searching.dtoseventsenums.DownloadType.NZB);
        assertTrue("Torznab indexers should be selected for internal NZB searches", testee.checkTorznabOnlyUsedForTorrentOrInternalSearches(indexer));

        indexerConfigMock.setSearchModuleType(SearchModuleType.TORZNAB);
        when(searchRequest.getSource()).thenReturn(SearchSource.API);
        when(searchRequest.getDownloadType()).thenReturn(DownloadType.NZB);
        assertFalse("Torznab indexers should not be selected for API NZB searches", testee.checkTorznabOnlyUsedForTorrentOrInternalSearches(indexer));
    }

    @Test
    public void shouldCalculateNextHitWithFixedResetTime() {
        //First access was at 05:38, hit limit reset time is 10:00, next possible hit today at 10:00
        Instant currentTime = Instant.ofEpochSecond(1518500323);//05:38
        testee.clock = Clock.fixed(currentTime, ZoneId.of("UTC"));
        indexerConfigMock.setHitLimitResetTime(10);

        LocalDateTime nextHit = testee.calculateNextPossibleHit(indexerConfigMock, currentTime);

        assertThat(nextHit.getHour()).isEqualTo(10);
        assertThat(nextHit.getDayOfYear()).isEqualTo(LocalDateTime.ofInstant(currentTime, ZoneId.of("UTC")).get(ChronoField.DAY_OF_YEAR));

        //First access was at 05:38, hit limit time is 04:00, next possible hit tomorrow at 04:00
        currentTime = Instant.ofEpochSecond(1518500323);//05:38
        testee.clock = Clock.fixed(currentTime, ZoneId.of("UTC"));
        indexerConfigMock.setHitLimitResetTime(4);

        nextHit = testee.calculateNextPossibleHit(indexerConfigMock, currentTime);

        assertThat(nextHit.getHour()).isEqualTo(4);
        assertThat(nextHit.getDayOfYear()).isEqualTo(LocalDateTime.ofInstant(currentTime, ZoneId.of("UTC")).get(ChronoField.DAY_OF_YEAR) + 1);
    }



    @Test
    public void shouldHonorSchedule() throws Exception {
        testee.clock = Clock.fixed(Instant.ofEpochSecond(1512974083), ZoneId.of("UTC")); //Monday, December 11, 2017 6:34:43 AM
        assertThat(testee.isInTime("mo")).isTrue();
        assertThat(testee.isInTime("mo-tu")).isTrue();
        assertThat(testee.isInTime("mo-su")).isTrue();
        assertThat(testee.isInTime("tu-mo")).isTrue();
        assertThat(testee.isInTime("tu")).isFalse();
        assertThat(testee.isInTime("tu-we")).isFalse();

        assertThat(testee.isInTime("mo6")).isTrue();
        assertThat(testee.isInTime("mo6-10")).isTrue();
        assertThat(testee.isInTime("mo6-23")).isTrue();
        assertThat(testee.isInTime("mo1-10")).isTrue();
        assertThat(testee.isInTime("mo1-5")).isFalse();
        assertThat(testee.isInTime("mo7-23")).isFalse();
        assertThat(testee.isInTime("mo22-8")).isTrue();
        assertThat(testee.isInTime("mo22-5")).isFalse();

        assertThat(testee.isInTime("mo-tu6")).isTrue();
        assertThat(testee.isInTime("mo-tu6-10")).isTrue();
        assertThat(testee.isInTime("mo-tu1-2")).isFalse();
        assertThat(testee.isInTime("tu-we6")).isFalse();
        assertThat(testee.isInTime("tu-we6-10")).isFalse();

        assertThat(testee.isInTime("6")).isTrue();
        assertThat(testee.isInTime("6-10")).isTrue();
        assertThat(testee.isInTime("7-10")).isFalse();
        assertThat(testee.isInTime("10-7")).isTrue();

        indexerConfigMock.setSchedule(Arrays.asList("tu-we6", "mo"));
        assertThat(testee.checkSchedule(indexer)).isTrue();

        indexerConfigMock.setSchedule(Arrays.asList("tu-we6"));
        assertThat(testee.checkSchedule(indexer)).isFalse();

        testee.clock = Clock.fixed(Instant.ofEpochSecond(1513412203), ZoneId.of("UTC")); //Saturday, December 16, 2017 8:16:43 AM
        assertThat(testee.isInTime("fr-sa")).isTrue();
        assertThat(testee.isInTime("mo-sa")).isTrue();
    }


}