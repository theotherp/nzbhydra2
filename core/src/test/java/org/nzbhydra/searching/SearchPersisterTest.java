package org.nzbhydra.searching;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.indexers.IndexerSearchEntity;
import org.nzbhydra.indexers.IndexerSearchRepository;
import org.nzbhydra.indexers.IndexerSearchResultPersistor;
import org.nzbhydra.searching.IndexerForSearchSelector.IndexerForSearchSelection;
import org.nzbhydra.searching.db.SearchEntity;
import org.nzbhydra.searching.db.SearchRepository;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.Set;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@SuppressWarnings("unchecked")
@MockitoSettings(strictness = Strictness.LENIENT)
class SearchPersisterTest {

    @Mock
    private ConfigProvider configProviderMock;
    @Mock
    private TransactionTemplate transactionTemplateMock;
    @Mock
    private SearchRepository searchRepositoryMock;
    @Mock
    private IndexerSearchRepository indexerSearchRepositoryMock;
    @Mock
    private SearchResultRepository searchResultRepositoryMock;
    @Mock
    private IndexerSearchResultPersistor indexerSearchResultPersistorMock;
    @Mock
    private Indexer indexer1;
    @Mock
    private IndexerForSearchSelection selectionResultMock;

    private final IndexerEntity indexerEntity = new IndexerEntity();
    private SearchPersister searchPersister;
    private long nextSearchResultEntityId = 1;

    @BeforeEach
    void setUp() {
        searchPersister = new SearchPersister(configProviderMock, transactionTemplateMock, searchRepositoryMock, indexerSearchRepositoryMock, searchResultRepositoryMock, indexerSearchResultPersistorMock);
        when(indexer1.getName()).thenReturn("indexer1");
        when(indexer1.getIndexerEntity()).thenReturn(indexerEntity);
        when(indexerSearchRepositoryMock.save(any(IndexerSearchEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        doAnswer(invocation -> {
            invocation.getArgument(0, Consumer.class).accept(null);
            return null;
        }).when(transactionTemplateMock).executeWithoutResult(any());
    }

    private void configWithKeepHistory(boolean keepHistory) {
        BaseConfig config = new BaseConfig();
        config.getMain().setKeepHistory(keepHistory);
        when(configProviderMock.getBaseConfig()).thenReturn(config);
    }

    private SearchCacheEntry searchCacheEntryWith(IndexerSearchCacheEntry indexerSearchCacheEntry) {
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        SearchCacheEntry searchCacheEntry = new SearchCacheEntry(searchRequest, selectionResultMock, new SearchEntity());
        searchCacheEntry.getIndexerCacheEntries().put("indexer1", indexerSearchCacheEntry);
        return searchCacheEntry;
    }

    private IndexerSearchResult indexerSearchResultWithOneEntity() {
        SearchResultEntity searchResultEntity = new SearchResultEntity();
        long id = nextSearchResultEntityId++;
        searchResultEntity.setId(id);
        searchResultEntity.setHash(id * 1000);
        IndexerSearchResult indexerSearchResult = new IndexerSearchResult();
        indexerSearchResult.setIndexer(indexer1);
        indexerSearchResult.setWasSuccessful(true);
        indexerSearchResult.setTotalResults(10);
        indexerSearchResult.setSearchResultEntities(Set.of(searchResultEntity));
        return indexerSearchResult;
    }

    // ------------------------------------------------------------------------------------------------
    // createSearchEntity
    // ------------------------------------------------------------------------------------------------

    @Test
    void shouldSaveTheSearchEntityWithTheRawQueryWhenHistoryIsKept() {
        configWithKeepHistory(true);
        SearchRequest searchRequest = new SearchRequest(SearchSource.API, SearchType.SEARCH, 0, 100);
        searchRequest.setQuery("foo");

        SearchEntity searchEntity = searchPersister.createSearchEntity(searchRequest, "foo --bar");

        ArgumentCaptor<SearchEntity> captor = ArgumentCaptor.forClass(SearchEntity.class);
        verify(searchRepositoryMock).save(captor.capture());
        assertThat(captor.getValue()).isSameAs(searchEntity);
        assertThat(searchEntity.getQuery()).isEqualTo("foo --bar");
        assertThat(searchEntity.getSource()).isEqualTo(SearchSource.API);
    }

    @Test
    void shouldNotSaveTheSearchEntityWhenHistoryIsNotKept() {
        configWithKeepHistory(false);
        SearchRequest searchRequest = new SearchRequest(SearchSource.API, SearchType.SEARCH, 0, 100);

        SearchEntity searchEntity = searchPersister.createSearchEntity(searchRequest, null);

        assertThat(searchEntity).isNotNull();
        verify(searchRepositoryMock, never()).save(any(SearchEntity.class));
    }

    // ------------------------------------------------------------------------------------------------
    // persistNewIndexerSearchResults
    // ------------------------------------------------------------------------------------------------

    @Test
    void shouldSaveTheIndexerSearchEntityAndTheOccurrencesWhenHistoryIsKept() {
        configWithKeepHistory(true);
        IndexerSearchCacheEntry indexerSearchCacheEntry = new IndexerSearchCacheEntry(indexer1);
        IndexerSearchResult indexerSearchResult = indexerSearchResultWithOneEntity();
        indexerSearchCacheEntry.addIndexerSearchResult(indexerSearchResult);

        searchPersister.persistNewIndexerSearchResults(searchCacheEntryWith(indexerSearchCacheEntry));

        verify(indexerSearchRepositoryMock).save(any(IndexerSearchEntity.class));
        verify(indexerSearchResultPersistorMock).persistSearchResultOccurrences(indexerSearchCacheEntry.getIndexerSearchEntity(), indexerSearchResult.getSearchResultIds());
        verify(searchResultRepositoryMock).saveAll(indexerSearchResult.getSearchResultEntities());
    }

    @Test
    void shouldOnlySaveTheSearchResultEntitiesWhenHistoryIsNotKept() {
        configWithKeepHistory(false);
        IndexerSearchCacheEntry indexerSearchCacheEntry = new IndexerSearchCacheEntry(indexer1);
        IndexerSearchResult indexerSearchResult = indexerSearchResultWithOneEntity();
        indexerSearchCacheEntry.addIndexerSearchResult(indexerSearchResult);

        searchPersister.persistNewIndexerSearchResults(searchCacheEntryWith(indexerSearchCacheEntry));

        verify(indexerSearchRepositoryMock, never()).save(any(IndexerSearchEntity.class));
        verify(indexerSearchResultPersistorMock, never()).persistSearchResultOccurrences(any(), any());
        verify(searchResultRepositoryMock).saveAll(indexerSearchResult.getSearchResultEntities());
    }

    @Test
    void shouldOnlyPersistIndexerSearchResultsWhichWereNotPersistedBefore() {
        configWithKeepHistory(true);
        IndexerSearchCacheEntry indexerSearchCacheEntry = new IndexerSearchCacheEntry(indexer1);
        IndexerSearchResult firstPage = indexerSearchResultWithOneEntity();
        indexerSearchCacheEntry.addIndexerSearchResult(firstPage);
        SearchCacheEntry searchCacheEntry = searchCacheEntryWith(indexerSearchCacheEntry);

        searchPersister.persistNewIndexerSearchResults(searchCacheEntry);
        verify(indexerSearchRepositoryMock, times(1)).save(any(IndexerSearchEntity.class));

        //Nothing new -> nothing is written again
        searchPersister.persistNewIndexerSearchResults(searchCacheEntry);
        verify(indexerSearchRepositoryMock, times(1)).save(any(IndexerSearchEntity.class));
        verify(searchResultRepositoryMock, times(1)).saveAll(any());

        //A new page -> only that one is written
        IndexerSearchResult secondPage = indexerSearchResultWithOneEntity();
        indexerSearchCacheEntry.addIndexerSearchResult(secondPage);
        searchPersister.persistNewIndexerSearchResults(searchCacheEntry);
        verify(indexerSearchRepositoryMock, times(2)).save(any(IndexerSearchEntity.class));
        verify(searchResultRepositoryMock).saveAll(secondPage.getSearchResultEntities());
    }

}
