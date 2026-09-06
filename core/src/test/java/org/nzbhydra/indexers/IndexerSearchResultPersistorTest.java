

package org.nzbhydra.indexers;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.searching.SearchResultIdCalculator;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.searching.db.SearchResultIdAndHash;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class IndexerSearchResultPersistorTest {

    @Mock
    private SearchResultRepository searchResultRepository;
    @Mock
    private IndexerSearchResultOccurrenceRepository occurrenceRepository;
    @Mock
    private Indexer<?> indexer;
    @Mock
    private IndexerEntity indexerEntity;
    @Captor
    private ArgumentCaptor<List<SearchResultEntity>> entitiesCaptor;

    @InjectMocks
    private IndexerSearchResultPersistor testee;

    @BeforeEach
    void setUp() {
        lenient().when(indexer.getIndexerEntity()).thenReturn(indexerEntity);
        lenient().when(searchResultRepository.saveAll(anyCollection())).thenAnswer(invocation -> {
            List<SearchResultEntity> entities = List.copyOf(invocation.getArgument(0));
            long nextId = 100;
            for (SearchResultEntity entity : entities) {
                entity.setId(nextId++);
            }
            return entities;
        });
    }

    @Test
    void shouldPersistNewSearchResultsWithTheirHash() {
        // given
        SearchResultItem item1 = getSearchResultItem("title1", "link1", "guid1");
        SearchResultItem item2 = getSearchResultItem("title2", "link2", "guid2");
        List<SearchResultItem> items = List.of(item1, item2);
        IndexerSearchResult indexerSearchResult = new IndexerSearchResult();
        when(searchResultRepository.findIdsAndHashesByHashIn(anyCollection())).thenReturn(List.of());

        // when
        List<SearchResultItem> result = testee.persistSearchResults(indexer, items, indexerSearchResult);

        // then
        verify(searchResultRepository).saveAll(entitiesCaptor.capture());
        List<SearchResultEntity> savedEntities = entitiesCaptor.getValue();
        assertThat(savedEntities).hasSize(2);

        SearchResultEntity savedEntity1 = savedEntities.get(0);
        assertThat(savedEntity1.getTitle()).isEqualTo("title1");
        assertThat(savedEntity1.getLink()).isEqualTo("link1");
        assertThat(savedEntity1.getIndexerGuid()).isEqualTo("guid1");
        assertThat(savedEntity1.getIndexer()).isEqualTo(indexerEntity);
        assertThat(savedEntity1.getHash()).isEqualTo(SearchResultIdCalculator.calculateSearchResultHash(item1));

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getSearchResultId()).isEqualTo(SearchResultIdCalculator.calculateSearchResultHash(item1));
        assertThat(result.get(0).getGuid()).isEqualTo(SearchResultIdCalculator.calculateSearchResultHash(item1));

        assertThat(indexerSearchResult.getSearchResultEntities()).containsExactlyInAnyOrderElementsOf(savedEntities);
        assertThat(indexerSearchResult.getExistingSearchResultIds()).isEmpty();
        assertThat(indexerSearchResult.getSearchResultIds()).containsExactlyInAnyOrder(100L, 101L);
    }

    @Test
    void shouldNotPersistExistingSearchResultsButRememberTheirIds() {
        // given
        SearchResultItem item1 = getSearchResultItem("title1", "link1", "guid1");
        SearchResultItem item2 = getSearchResultItem("title2", "link2", "guid2");
        List<SearchResultItem> items = List.of(item1, item2);
        IndexerSearchResult indexerSearchResult = new IndexerSearchResult();

        long existingHash = SearchResultIdCalculator.calculateSearchResultHash(item1);
        when(searchResultRepository.findIdsAndHashesByHashIn(anyCollection())).thenReturn(List.of(idAndHash(7L, existingHash)));

        // when
        List<SearchResultItem> result = testee.persistSearchResults(indexer, items, indexerSearchResult);

        // then
        verify(searchResultRepository).findIdsAndHashesByHashIn(List.of(existingHash, SearchResultIdCalculator.calculateSearchResultHash(item2)));
        verify(searchResultRepository).saveAll(entitiesCaptor.capture());
        List<SearchResultEntity> savedEntities = entitiesCaptor.getValue();
        assertThat(savedEntities).hasSize(1);
        assertThat(savedEntities.get(0).getTitle()).isEqualTo("title2");

        assertThat(result).hasSize(2);
        //The externally visible ID stays the hash
        assertThat(result.get(0).getSearchResultId()).isEqualTo(existingHash);

        assertThat(indexerSearchResult.getSearchResultEntities()).containsExactly(savedEntities.get(0));
        assertThat(indexerSearchResult.getExistingSearchResultIds()).containsExactly(7L);
        assertThat(indexerSearchResult.getSearchResultIds()).containsExactlyInAnyOrder(7L, 100L);
    }

    @Test
    void shouldMergeSearchResultOccurrences() {
        IndexerSearchEntity indexerSearch = new IndexerSearchEntity();
        indexerSearch.setId(1);
        testee.persistSearchResultOccurrences(indexerSearch, List.of(1L, 2L));

        verify(occurrenceRepository).merge(1, 1L);
        verify(occurrenceRepository).merge(1, 2L);
    }

    private SearchResultIdAndHash idAndHash(long id, long hash) {
        return new SearchResultIdAndHash() {
            @Override
            public long getId() {
                return id;
            }

            @Override
            public long getHash() {
                return hash;
            }
        };
    }

    private SearchResultItem getSearchResultItem(String title, String link, String guid) {
        SearchResultItem item = new SearchResultItem();
        item.setTitle(title);
        item.setLink(link);
        item.setIndexerGuid(guid);
        item.setDetails("details");
        item.setDownloadType(DownloadType.NZB);
        item.setPubDate(Instant.now());
        item.setIndexer(indexer);
        return item;
    }

}
