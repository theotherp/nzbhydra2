package org.nzbhydra.historystats;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.historystats.stats.HistoryRequest;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.indexers.IndexerSearchEntity;
import org.nzbhydra.indexers.IndexerSearchRepository;
import org.nzbhydra.searching.db.SearchEntity;
import org.nzbhydra.searching.db.SearchRepository;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HistoryTest {

    @InjectMocks
    private History testee;

    @Mock
    private SearchRepository searchRepository;

    @Mock
    private IndexerSearchRepository indexerSearchRepository;

    @Mock
    private EntityManager entityManager;

    @Mock(answer = org.mockito.Answers.RETURNS_DEEP_STUBS)
    private org.nzbhydra.config.ConfigProvider configProvider;

    @org.junit.jupiter.api.AfterEach
    void clearUsername() {
        org.nzbhydra.web.SessionStorage.username.remove();
    }

    private static org.springframework.data.domain.Page<SearchEntity> pageOf(SearchEntity... entities) {
        return new org.springframework.data.domain.PageImpl<>(List.of(entities));
    }

    @Test
    void shouldReturnNoSearchHistoryForAnonymousUserWhenAuthIsConfigured() {
        when(configProvider.getBaseConfig().getAuth().isAuthConfigured()).thenReturn(true);

        assertThat(testee.getHistoryForSearching()).isEmpty();

        verifyNoInteractions(searchRepository);
    }

    @Test
    void shouldReturnAllSearchesWhenAuthIsNotConfigured() {
        when(configProvider.getBaseConfig().getAuth().isAuthConfigured()).thenReturn(false);
        when(configProvider.getBaseConfig().getSearching().getHistoryForSearching()).thenReturn(10);
        SearchEntity search = new SearchEntity();
        when(searchRepository.findForUserSearchHistory(org.mockito.ArgumentMatchers.any(org.springframework.data.domain.Pageable.class))).thenReturn(pageOf(search));

        assertThat(testee.getHistoryForSearching()).containsExactly(search);
    }

    @Test
    void shouldReturnAllSearchesInNativeBuildWhenAuthIsNotConfigured() {
        String previous = System.getProperty("HYDRA_NATIVE_BUILD");
        System.setProperty("HYDRA_NATIVE_BUILD", "true");
        try {
            when(configProvider.getBaseConfig().getAuth().isAuthConfigured()).thenReturn(false);
            when(configProvider.getBaseConfig().getSearching().getHistoryForSearching()).thenReturn(10);
            SearchEntity search = new SearchEntity();
            when(searchRepository.findForUserSearchHistory(org.mockito.ArgumentMatchers.any(org.springframework.data.domain.Pageable.class))).thenReturn(pageOf(search));

            assertThat(testee.getHistoryForSearching()).containsExactly(search);
        } finally {
            if (previous == null) {
                System.clearProperty("HYDRA_NATIVE_BUILD");
            } else {
                System.setProperty("HYDRA_NATIVE_BUILD", previous);
            }
        }
    }

    @Test
    void shouldReturnOnlyOwnSearchesForLoggedInUser() {
        org.nzbhydra.web.SessionStorage.username.set("alice");
        when(configProvider.getBaseConfig().getSearching().getHistoryForSearching()).thenReturn(10);
        SearchEntity search = new SearchEntity();
        when(searchRepository.findForUserSearchHistory(org.mockito.ArgumentMatchers.eq("alice"), org.mockito.ArgumentMatchers.any(org.springframework.data.domain.Pageable.class))).thenReturn(pageOf(search));

        assertThat(testee.getHistoryForSearching()).containsExactly(search);
        org.mockito.Mockito.verify(searchRepository, org.mockito.Mockito.never()).findForUserSearchHistory(org.mockito.ArgumentMatchers.any(org.springframework.data.domain.Pageable.class));
    }

    @Test
    void shouldIncludeIndexerFailureMessageInSearchDetails() {
        SearchEntity search = new SearchEntity();
        search.setSource(SearchSource.API);
        IndexerEntity indexer = new IndexerEntity();
        indexer.setName("Mock1");
        IndexerSearchEntity indexerSearch = new IndexerSearchEntity();
        indexerSearch.setIndexerEntity(indexer);
        indexerSearch.setSuccessful(false);
        indexerSearch.setResultsCount(0);
        indexerSearch.setResponseTime(123L);
        indexerSearch.setErrorMessage("Read timed out");

        when(searchRepository.findById(42)).thenReturn(Optional.of(search));
        when(indexerSearchRepository.findBySearchEntity(search)).thenReturn(List.of(indexerSearch));

        History.SearchDetails details = testee.getSearchDetails(42);

        assertThat(details.getIndexerSearches()).singleElement().satisfies(indexerSearchDetails -> {
            assertThat(indexerSearchDetails.getIndexerName()).isEqualTo("Mock1");
            assertThat(indexerSearchDetails.isSuccessful()).isFalse();
            assertThat(indexerSearchDetails.getResponseTime()).isEqualTo(123L);
            assertThat(indexerSearchDetails.getErrorMessage()).isEqualTo("Read timed out");
        });
    }

    @Test
    void shouldRejectInjectionViaFilterColumnWithoutQuerying() {
        HistoryRequest request = new HistoryRequest();
        request.getFilterModel().put("time) OR 1=1 --", new FilterDefinition("x", "freetext", null));

        assertRejectedWithoutQuery(request, History.SEARCH_TABLE);
    }

    @Test
    void shouldRejectInjectionViaSortColumnWithoutQuerying() {
        HistoryRequest request = new HistoryRequest();
        request.setSortModel(new SortModel("(select password from users)", 1));

        assertRejectedWithoutQuery(request, History.SEARCH_TABLE);
    }

    @Test
    void shouldRejectInjectionViaNumberRangeWithoutQuerying() {
        HistoryRequest request = new HistoryRequest();
        request.getFilterModel().put("age", new FilterDefinition(Map.of("min", "0 OR 1=1"), "numberRange", null));

        assertRejectedWithoutQuery(request, History.DOWNLOAD_TABLE);
    }

    @Test
    void shouldRejectInjectionViaTimeWithoutQuerying() {
        HistoryRequest request = new HistoryRequest();
        request.getFilterModel().put("time", new FilterDefinition(Map.of("after", "2026-01-01T00:00:00.000Z', 'yyyy') OR (1=1"), "time", null));

        assertRejectedWithoutQuery(request, History.NOTIFICATION_TABLE);
    }

    @Test
    void shouldRejectColumnOfAnotherTableWithoutQuerying() {
        HistoryRequest request = new HistoryRequest();
        request.getFilterModel().put("age", new FilterDefinition(Map.of("min", "1"), "numberRange", null));

        assertRejectedWithoutQuery(request, History.SEARCH_TABLE);
    }

    @Test
    void shouldRejectInvalidPagingWithoutQuerying() {
        HistoryRequest pageZero = new HistoryRequest();
        pageZero.setPage(0);
        assertRejectedWithoutQuery(pageZero, History.SEARCH_TABLE);

        HistoryRequest limitTooHigh = new HistoryRequest();
        limitTooHigh.setLimit(HistoryQueryBuilder.MAX_LIMIT + 1);
        assertRejectedWithoutQuery(limitTooHigh, History.SEARCH_TABLE);

        HistoryRequest limitZero = new HistoryRequest();
        limitZero.setLimit(0);
        assertRejectedWithoutQuery(limitZero, History.SEARCH_TABLE);
    }

    private void assertRejectedWithoutQuery(HistoryRequest request, String table) {
        assertThatThrownBy(() -> testee.getHistory(request, table, Object.class))
                .isInstanceOf(InvalidHistoryRequestException.class);
        verifyNoInteractions(entityManager);
    }
}
