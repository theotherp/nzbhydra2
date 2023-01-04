package org.nzbhydra.searching;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
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
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.downloading.FileDownloadRepository;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.indexers.IndexerApiAccessRepository;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.indexers.status.IndexerLimit;
import org.nzbhydra.indexers.status.IndexerLimitRepository;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.mediainfo.MediaIdType;
import org.nzbhydra.searching.dtoseventsenums.DownloadType;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchSource;
import org.springframework.context.ApplicationEventPublisher;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
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
    @Mock
    private IndexerLimitRepository indexerLimitRepositoryMock;


    private Map<Indexer, String> count;
    private final IndexerLimit indexerLimit = new IndexerLimit();

    @InjectMocks
    private IndexerForSearchSelector testee;

    @BeforeEach
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
        when(indexerLimitRepositoryMock.findByIndexer(any())).thenReturn(indexerLimit);
    }


    @Test
    void shouldCheckIfSelectedByUser() {
        when(searchModuleProviderMock.getIndexers()).thenReturn(Arrays.asList(indexer));
        when(searchRequest.getSource()).thenReturn(SearchSource.INTERNAL);
        when(searchRequest.getIndexers()).thenReturn(Optional.of(Sets.newSet("anotherIndexer")));

        assertThat(testee.checkIndexerSelected(indexer)).isFalse();

        when(searchRequest.getSource()).thenReturn(SearchSource.API);
        assertThat(testee.checkIndexerSelected(indexer)).isFalse();

        when(searchRequest.getIndexers()).thenReturn(Optional.of(Sets.newSet("indexer")));

        when(searchRequest.getSource()).thenReturn(SearchSource.INTERNAL);
        assertTrue(testee.checkIndexerSelected(indexer));

        when(searchRequest.getSource()).thenReturn(SearchSource.API);
        assertTrue(testee.checkIndexerSelected(indexer));
    }

    @Test
    void shouldCheckIfDisabledBySystem() {
        when(searchingConfig.isIgnoreTemporarilyDisabled()).thenReturn(false);

        indexerConfigMock.setState(IndexerConfig.State.ENABLED);
        indexerConfigMock.setDisabledUntil(null);
        assertTrue(testee.checkIndexerStatus(indexer));

        indexerConfigMock.setState(IndexerConfig.State.DISABLED_SYSTEM_TEMPORARY);
        indexerConfigMock.setDisabledUntil(Instant.now().plus(1, ChronoUnit.DAYS).toEpochMilli());
        assertThat(testee.checkIndexerStatus(indexer)).isFalse();

        indexerConfigMock.setState(IndexerConfig.State.DISABLED_SYSTEM);
        assertThat(testee.checkIndexerStatus(indexer)).isFalse();
    }

    @Test
    void shouldCheckForCategory() {
        when(searchRequest.getCategory()).thenReturn(category);
        indexerConfigMock.setEnabledCategories(Collections.emptyList());

        assertTrue(testee.checkDisabledForCategory(indexer));

        indexerConfigMock.setEnabledCategories(Arrays.asList("anotherCategory"));
        assertThat(testee.checkDisabledForCategory(indexer)).isFalse();

        indexerConfigMock.setEnabledCategories(Arrays.asList(("category")));
        assertTrue(testee.checkDisabledForCategory(indexer));
    }

    @Test
    void shouldCheckForLoadLimiting() {
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
    void shouldCheckContext() {
        when(searchModuleProviderMock.getIndexers()).thenReturn(Arrays.asList(indexer));
        when(searchRequest.getSource()).thenReturn(SearchSource.INTERNAL);
        indexerConfigMock.setEnabledForSearchSource(SearchSourceRestriction.API);

        assertThat(testee.checkSearchSource(indexer)).isFalse();

        when(searchRequest.getSource()).thenReturn(SearchSource.API);
        assertTrue(testee.checkSearchSource(indexer));
    }

    @Test
    void shouldCheckIdConversion() {
        Set<MediaIdType> supported = Sets.newSet(MediaIdType.TVMAZE, MediaIdType.TVDB);
        Set<MediaIdType> provided = Sets.newSet(MediaIdType.TVMAZE);

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
    void shouldIgnoreHitAndDownloadLimitIfNoneAreSet() {
        indexerConfigMock.setHitLimit(null);
        indexerConfigMock.setDownloadLimit(null);
        testee.checkIndexerHitLimit(indexer);
        verify(nzbDownloadRepository, never()).findBySearchResultIndexerOrderByTimeDesc(any(), any());
        verify(indexerApiAccessRepository, never()).findByIndexerOrderByTimeDesc(any(), any());
    }

    @Test
    void shouldIgnoreHitLimitIfNotYetReached() {
        indexerConfigMock.setHitLimit(10);
        when(queryMock.getResultList()).thenReturn(Collections.emptyList());
        boolean result = testee.checkIndexerHitLimit(indexer);
        assertTrue(result);
        verify(entityManagerMock).createNativeQuery(anyString());
    }

    @Test
    void shouldFollowApiHitLimitRollingTimeWindowUsingAccessHistory() {
        //Last access was yesterday afternoon, next possible hit should be today at afternoon
        Instant currentTime = Instant.parse("2021-01-13T09:00:00.000Z");
        Instant firstAccess = Instant.parse("2021-01-12T16:00:00.000Z");
        testee.clock = Clock.fixed(currentTime, ZoneId.of("UTC"));
        indexerConfigMock.setHitLimit(1);
        indexerConfigMock.setHitLimitResetTime(null);
        when(queryMock.getResultList()).thenReturn(Arrays.asList(Timestamp.from(firstAccess)));
        boolean result = testee.checkIndexerHitLimit(indexer);
        assertThat(result).isFalse();
        verify(entityManagerMock).createNativeQuery(anyString());
    }

    @Test
    void shouldFollowApiHitLimitFixedResetTimeLaterUsingAccessHistoryAboveLimit() {
        //Last access was yesterday afternoon, fixed reset time is later today, should allow then
        Instant currentTime = Instant.parse("2021-01-13T09:00:00.000Z");
        Instant firstAccess = Instant.parse("2021-01-12T16:00:00.000Z");
        testee.clock = Clock.fixed(currentTime, ZoneId.of("UTC"));
        indexerConfigMock.setHitLimit(1);
        indexerConfigMock.setHitLimitResetTime(12);
        when(queryMock.getResultList()).thenReturn(Arrays.asList(Timestamp.from(firstAccess)));
        boolean result = testee.checkIndexerHitLimit(indexer);
        assertThat(result).isFalse();
        verify(entityManagerMock).createNativeQuery(anyString());
    }

    @Test
    void shouldFollowApiHitLimitFixedResetTimeLaterUsingAccessHistoryBelowLimit() {
        //Last access was yesterday afternoon, fixed reset time is later today, should allow then
        Instant currentTime = Instant.parse("2021-01-13T09:00:00.000Z");
        Instant firstAccess = Instant.parse("2021-01-12T16:00:00.000Z");
        testee.clock = Clock.fixed(currentTime, ZoneId.of("UTC"));
        indexerConfigMock.setHitLimit(2);
        indexerConfigMock.setHitLimitResetTime(12);
        when(queryMock.getResultList()).thenReturn(Arrays.asList(Timestamp.from(firstAccess)));
        boolean result = testee.checkIndexerHitLimit(indexer);
        assertTrue(result);
        verify(entityManagerMock).createNativeQuery(anyString());
    }

    @Test
    void shouldFollowApiHitLimitFixedResetTimeReachedUsingAccessHistoryA() {
        //Last access was yesterday afternoon, fixed reset time was today, should allow
        Instant currentTime = Instant.parse("2021-01-13T09:00:00.000Z");
        Instant firstAccess = Instant.parse("2021-01-12T16:00:00.000Z");
        testee.clock = Clock.fixed(currentTime, ZoneId.of("UTC"));
        indexerConfigMock.setHitLimit(1);
        indexerConfigMock.setHitLimitResetTime(6);
        when(queryMock.getResultList()).thenReturn(Arrays.asList(Timestamp.from(firstAccess)));
        boolean result = testee.checkIndexerHitLimit(indexer);
        assertTrue(result);
        verify(entityManagerMock).createNativeQuery(anyString());
    }

    @Test
    void shouldFollowApiHitLimitUsingApiHitsAndOldestHitAboveLimit() {
        //Last access was yesterday afternoon, next possible hit should be today at afternoon
        Instant currentTime = Instant.parse("2021-01-13T09:00:00.000Z");
        Instant firstAccess = Instant.parse("2021-01-12T16:00:00.000Z");
        testee.clock = Clock.fixed(currentTime, ZoneId.of("UTC"));
        indexerConfigMock.setHitLimit(1);
        indexerLimit.setApiHits(1);
        indexerLimit.setOldestApiHit(firstAccess);

        boolean result = testee.checkIndexerHitLimit(indexer);
        assertThat(result).isFalse();
        verify(entityManagerMock, never()).createNativeQuery(anyString());
    }

    @Test
    void shouldFollowApiHitLimitUsingApiHitsAndOldestHitOlderThanOneDay() {
        //Last access was yesterday afternoon, next possible hit should be today at afternoon
        Instant currentTime = Instant.parse("2021-01-13T09:00:00.000Z");
        Instant firstAccess = Instant.parse("2021-01-11T16:00:00.000Z");
        testee.clock = Clock.fixed(currentTime, ZoneId.of("UTC"));
        indexerConfigMock.setHitLimit(1);
        indexerLimit.setApiHits(1);
        indexerLimit.setOldestApiHit(firstAccess);

        boolean result = testee.checkIndexerHitLimit(indexer);
        assertTrue(result);
        verify(entityManagerMock, never()).createNativeQuery(anyString());
    }

    @Test
    void shouldFollowApiHitLimitUsingApiHitsAndOldestHitBelowlimit() {
        //Last access was yesterday afternoon, next possible hit should be today at afternoon
        Instant currentTime = Instant.parse("2021-01-13T09:00:00.000Z");
        Instant firstAccess = Instant.parse("2021-01-12T16:00:00.000Z");
        testee.clock = Clock.fixed(currentTime, ZoneId.of("UTC"));
        indexerConfigMock.setHitLimit(2);
        indexerLimit.setApiHits(1);
        indexerLimit.setOldestApiHit(firstAccess);

        boolean result = testee.checkIndexerHitLimit(indexer);
        assertTrue(result);
        verify(entityManagerMock, never()).createNativeQuery(anyString());
    }

    @Test
    void shouldPreferApiResultOldestHitOverHistory() {
        //Last access was yesterday afternoon, next possible hit should be today at afternoon
        Instant currentTime = Instant.parse("2021-01-13T09:00:00.000Z");
        //A while ago
        Instant oldestHitDatabase = Instant.parse("2021-01-01T16:00:00.000Z");
        Instant oldestHitApiResult = Instant.parse("2021-01-12T16:00:00.000Z");
        testee.clock = Clock.fixed(currentTime, ZoneId.of("UTC"));
        indexerConfigMock.setHitLimit(1);
        indexerLimit.setApiHits(1);
        when(queryMock.getResultList()).thenReturn(Arrays.asList(Timestamp.from(oldestHitDatabase)));
        indexerLimit.setOldestApiHit(oldestHitApiResult);

        boolean result = testee.checkIndexerHitLimit(indexer);
        assertThat(result).isFalse();
        verify(entityManagerMock, never()).createNativeQuery(anyString());
    }

    @Test
    void shouldFollowApiHitLimitUsingApiHitsFromResponsAndOldestHitFromHistory() {
        //Last access was yesterday afternoon, next possible hit should be today at afternoon
        Instant currentTime = Instant.parse("2021-01-13T09:00:00.000Z");
        Instant firstAccess = Instant.parse("2021-01-12T16:00:00.000Z");
        testee.clock = Clock.fixed(currentTime, ZoneId.of("UTC"));
        indexerConfigMock.setHitLimit(1);
        indexerLimit.setApiHits(1);
        when(queryMock.getResultList()).thenReturn(Arrays.asList(Timestamp.from(firstAccess)));

        boolean result = testee.checkIndexerHitLimit(indexer);

        assertThat(result).isFalse();
        verify(entityManagerMock).createNativeQuery(anyString());
    }

    @Test
    void shouldIgnoreDownloadLimitIfNotYetReachedUsingAccessHistory() {
        indexerConfigMock.setDownloadLimit(10);
        when(queryMock.getResultList()).thenReturn(Arrays.asList(Timestamp.from(Instant.now().minus(10, ChronoUnit.MILLIS))));
        boolean result = testee.checkIndexerHitLimit(indexer);
        assertTrue(result);
    }

    @Test
    void shouldCalculateNextHitWithRollingTimeWindows() throws Exception {
        //First access was at 05:38, hit limit reset time is 10:00, now it's 09:00, next possible hit tomorrow at 05:38
        Instant currentTime = Instant.parse("2021-01-13T09:00:00.000Z");
        Instant firstAccess = Instant.parse("2021-01-13T05:38:00.000Z");
        testee.clock = Clock.fixed(currentTime, ZoneId.of("UTC"));
        indexerConfigMock.setHitLimitResetTime(null);

        Instant nextHit = testee.calculateNextPossibleHit(indexerConfigMock, firstAccess).toInstant(ZoneOffset.UTC);

        assertThat(nextHit).isEqualTo(Instant.parse("2021-01-14T05:38:00.000Z"));
    }

    @Test
    void shouldOnlyUseTorznabIndexersForTorrentSearches() throws Exception {
        indexerConfigMock.setSearchModuleType(SearchModuleType.NEWZNAB);
        when(searchRequest.getDownloadType()).thenReturn(org.nzbhydra.searching.dtoseventsenums.DownloadType.TORRENT);
        assertFalse(testee.checkTorznabOnlyUsedForTorrentOrInternalSearches(indexer), "Only torznab indexers should be used for torrent searches");

        indexerConfigMock.setSearchModuleType(SearchModuleType.TORZNAB);
        when(searchRequest.getDownloadType()).thenReturn(org.nzbhydra.searching.dtoseventsenums.DownloadType.TORRENT);
        assertTrue(testee.checkTorznabOnlyUsedForTorrentOrInternalSearches(indexer), "Torznab indexers should be used for torrent searches");

        indexerConfigMock.setSearchModuleType(SearchModuleType.TORZNAB);
        when(searchRequest.getSource()).thenReturn(SearchSource.INTERNAL);
        when(searchRequest.getDownloadType()).thenReturn(org.nzbhydra.searching.dtoseventsenums.DownloadType.NZB);
        assertTrue(testee.checkTorznabOnlyUsedForTorrentOrInternalSearches(indexer), "Torznab indexers should be selected for internal NZB searches");

        indexerConfigMock.setSearchModuleType(SearchModuleType.TORZNAB);
        when(searchRequest.getSource()).thenReturn(SearchSource.API);
        when(searchRequest.getDownloadType()).thenReturn(DownloadType.NZB);
        assertFalse(testee.checkTorznabOnlyUsedForTorrentOrInternalSearches(indexer), "Torznab indexers should not be selected for API NZB searches");
    }

    @Test
    void shouldCalculateNextHitWithFixedResetTime() {
        //First access was at 05:38, hit limit reset time is 10:00, now it's 09:00, next possible hit today at 10:00
        Instant currentTime = Instant.parse("2021-01-13T09:00:00.000Z");
        Instant firstAccess = Instant.parse("2021-01-13T05:38:00.000Z");
        testee.clock = Clock.fixed(currentTime, ZoneId.of("UTC"));
        indexerConfigMock.setHitLimitResetTime(10);

        Instant nextHit = testee.calculateNextPossibleHit(indexerConfigMock, firstAccess).toInstant(ZoneOffset.UTC);

        assertThat(nextHit).isEqualTo(Instant.parse("2021-01-13T10:00:00.000Z"));

        //First access was at 05:38, hit limit reset time is 10:00, now it's 14:00, next possible hit tomorrow at 04:00
        currentTime = Instant.parse("2021-01-13T14:00:00.000Z");
        testee.clock = Clock.fixed(currentTime, ZoneId.of("UTC"));
        indexerConfigMock.setHitLimitResetTime(4);

        nextHit = testee.calculateNextPossibleHit(indexerConfigMock, firstAccess).toInstant(ZoneOffset.UTC);

        assertThat(nextHit).isEqualTo(Instant.parse("2021-01-14T04:00:00.000Z"));
    }


    @Test
    void shouldHonorSchedule() throws Exception {
        testee.clock = Clock.fixed(Instant.ofEpochSecond(1512974083), ZoneId.of("UTC")); //Monday, December 11, 2017 6:34:43 AM
        assertTrue(testee.isInTime("mo"));
        assertTrue(testee.isInTime("mo-tu"));
        assertTrue(testee.isInTime("mo-su"));
        assertTrue(testee.isInTime("tu-mo"));
        assertThat(testee.isInTime("tu")).isFalse();
        assertThat(testee.isInTime("tu-we")).isFalse();

        assertTrue(testee.isInTime("mo6"));
        assertTrue(testee.isInTime("mo6-10"));
        assertTrue(testee.isInTime("mo6-23"));
        assertTrue(testee.isInTime("mo1-10"));
        assertThat(testee.isInTime("mo1-5")).isFalse();
        assertThat(testee.isInTime("mo7-23")).isFalse();
        assertTrue(testee.isInTime("mo22-8"));
        assertThat(testee.isInTime("mo22-5")).isFalse();

        assertTrue(testee.isInTime("mo-tu6"));
        assertTrue(testee.isInTime("mo-tu6-10"));
        assertThat(testee.isInTime("mo-tu1-2")).isFalse();
        assertThat(testee.isInTime("tu-we6")).isFalse();
        assertThat(testee.isInTime("tu-we6-10")).isFalse();

        assertTrue(testee.isInTime("6"));
        assertTrue(testee.isInTime("6-10"));
        assertThat(testee.isInTime("7-10")).isFalse();
        assertTrue(testee.isInTime("10-7"));

        indexerConfigMock.setSchedule(Arrays.asList("tu-we6", "mo"));
        assertTrue(testee.checkSchedule(indexer));

        indexerConfigMock.setSchedule(Arrays.asList("tu-we6"));
        assertThat(testee.checkSchedule(indexer)).isFalse();

        testee.clock = Clock.fixed(Instant.ofEpochSecond(1513412203), ZoneId.of("UTC")); //Saturday, December 16, 2017 8:16:43 AM
        assertTrue(testee.isInTime("fr-sa"));
        assertTrue(testee.isInTime("mo-sa"));
    }


}
