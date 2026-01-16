

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
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;

import java.time.Instant;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IndexerSearchResultPersistorTest {

    @Mock
    private SearchResultRepository searchResultRepository;
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
        when(indexer.getIndexerEntity()).thenReturn(indexerEntity);
    }

    @Test
    void shouldPersistNewSearchResults() {
        // given
        SearchResultItem item1 = getSearchResultItem("title1", "link1", "guid1");
        SearchResultItem item2 = getSearchResultItem("title2", "link2", "guid2");
        List<SearchResultItem> items = List.of(item1, item2);
        IndexerSearchResult indexerSearchResult = new IndexerSearchResult();
        when(searchResultRepository.findAllIdsByIdIn(anyList())).thenReturn(Set.of());

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

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getSearchResultId()).isEqualTo(SearchResultIdCalculator.calculateSearchResultId(item1));
    }

    @Test
    void shouldNotPersistExistingSearchResults() {
        // given
        SearchResultItem item1 = getSearchResultItem("title1", "link1", "guid1");
        SearchResultItem item2 = getSearchResultItem("title2", "link2", "guid2");
        List<SearchResultItem> items = List.of(item1, item2);
        IndexerSearchResult indexerSearchResult = new IndexerSearchResult();


        long existingId = SearchResultIdCalculator.calculateSearchResultId(item1);
        when(searchResultRepository.findAllIdsByIdIn(anyList())).thenReturn(Set.of(existingId));

        // when
        List<SearchResultItem> result = testee.persistSearchResults(indexer, items, indexerSearchResult);

        // then
        verify(searchResultRepository).saveAll(entitiesCaptor.capture());
        List<SearchResultEntity> savedEntities = entitiesCaptor.getValue();
        assertThat(savedEntities).hasSize(1);
        assertThat(savedEntities.get(0).getTitle()).isEqualTo("title2");

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getSearchResultId()).isEqualTo(existingId);
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