package org.nzbhydra.historystats;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.indexers.IndexerSearchEntity;
import org.nzbhydra.indexers.IndexerSearchRepository;
import org.nzbhydra.searching.db.SearchEntity;
import org.nzbhydra.searching.db.SearchRepository;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HistoryTest {

    @InjectMocks
    private History testee;

    @Mock
    private SearchRepository searchRepository;

    @Mock
    private IndexerSearchRepository indexerSearchRepository;

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
        indexerSearch.setErrorMessage("Read timed out");

        when(searchRepository.findById(42)).thenReturn(Optional.of(search));
        when(indexerSearchRepository.findBySearchEntity(search)).thenReturn(List.of(indexerSearch));

        History.SearchDetails details = testee.getSearchDetails(42);

        assertThat(details.getIndexerSearches()).singleElement().satisfies(indexerSearchDetails -> {
            assertThat(indexerSearchDetails.getIndexerName()).isEqualTo("Mock1");
            assertThat(indexerSearchDetails.isSuccessful()).isFalse();
            assertThat(indexerSearchDetails.getErrorMessage()).isEqualTo("Read timed out");
        });
    }
}
