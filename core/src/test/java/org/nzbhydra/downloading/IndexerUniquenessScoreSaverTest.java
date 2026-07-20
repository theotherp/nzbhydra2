package org.nzbhydra.downloading;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.config.downloading.FileDownloadAccessType;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.indexers.IndexerSearchEntity;
import org.nzbhydra.indexers.IndexerSearchRepository;
import org.nzbhydra.indexers.IndexerSearchResultOccurrenceEntity;
import org.nzbhydra.indexers.IndexerSearchResultOccurrenceRepository;
import org.nzbhydra.searching.db.SearchEntity;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.searching.uniqueness.IndexerUniquenessScoreEntity;
import org.nzbhydra.searching.uniqueness.IndexerUniquenessScoreEntityRepository;

import java.time.Instant;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class IndexerUniquenessScoreSaverTest {

    @Mock
    private ConfigProvider configProvider;
    @Mock
    private IndexerSearchRepository indexerSearchRepository;
    @Mock
    private IndexerSearchResultOccurrenceRepository occurrenceRepository;
    @Mock
    private IndexerUniquenessScoreEntityRepository scoreRepository;
    @InjectMocks
    private IndexerUniquenessScoreSaver testee;

    private SearchEntity search;
    private IndexerEntity downloadedIndexer;
    private IndexerEntity matchingIndexer;
    private IndexerEntity missingIndexer;
    private IndexerSearchEntity downloadedSearch;
    private IndexerSearchEntity matchingSearch;
    private IndexerSearchEntity missingSearch;
    private SearchResultEntity downloadedResult;

    @BeforeEach
    void setUp() {
        search = new SearchEntity();
        search.setId(1);
        downloadedIndexer = indexer("downloaded", 1);
        matchingIndexer = indexer("matching", 2);
        missingIndexer = indexer("missing", 3);
        downloadedSearch = indexerSearch(downloadedIndexer, 1);
        matchingSearch = indexerSearch(matchingIndexer, 2);
        missingSearch = indexerSearch(missingIndexer, 3);
        downloadedResult = result(downloadedIndexer, "A.Release-Name");
    }

    @Test
    void shouldScoreOnlyMatchingResultsFromRelatedSearch() {
        SearchResultEntity matchingResult = result(matchingIndexer, "a release_name");
        downloadedResult.setDownloadSearchId(search.getId());

        when(occurrenceRepository.findBySearchResultAndIndexerSearchSearchEntityId(downloadedResult, search.getId()))
                .thenReturn(List.of(occurrence(downloadedSearch, downloadedResult)));
        when(indexerSearchRepository.findBySearchEntity(search)).thenReturn(List.of(downloadedSearch, matchingSearch, missingSearch));
        when(occurrenceRepository.findByIndexerSearchSearchEntityId(search.getId())).thenReturn(List.of(
                occurrence(downloadedSearch, downloadedResult),
                occurrence(matchingSearch, matchingResult)
        ));

        testee.handleDownloadEvent(event(FileDownloadStatus.NZB_DOWNLOAD_SUCCESSFUL));

        ArgumentCaptor<Set<IndexerUniquenessScoreEntity>> captor = ArgumentCaptor.forClass(Set.class);
        verify(scoreRepository).saveAll(captor.capture());
        assertThat(captor.getValue()).hasSize(3);
        assertThat(captor.getValue())
                .allSatisfy(score -> assertThat(score.getInvolved()).isEqualTo(3));
        assertThat(captor.getValue())
                .filteredOn(IndexerUniquenessScoreEntity::isHasResult)
                .extracting(score -> score.getIndexer().getName())
                .containsExactlyInAnyOrder("downloaded", "matching");
        assertThat(captor.getValue())
                .filteredOn(score -> score.getIndexer().equals(missingIndexer))
                .singleElement()
                .satisfies(score -> assertThat(score.isHasResult()).isFalse());
    }

    @Test
    void shouldNotSaveScoreForFailedDownload() {
        testee.handleDownloadEvent(event(FileDownloadStatus.NZB_DOWNLOAD_ERROR));

        verify(scoreRepository, never()).saveAll(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void shouldNotSaveScoreForLegacyDownloadIdentifier() {
        testee.handleDownloadEvent(event(FileDownloadStatus.NZB_DOWNLOAD_SUCCESSFUL));

        verify(scoreRepository, never()).saveAll(org.mockito.ArgumentMatchers.any());
    }

    private FileDownloadEvent event(FileDownloadStatus status) {
        FileDownloadEntity download = new FileDownloadEntity(downloadedResult, FileDownloadAccessType.PROXY, SearchSource.INTERNAL, status, null);
        download.setId(123);
        return new FileDownloadEvent(download, downloadedResult);
    }

    private IndexerEntity indexer(String name, int id) {
        IndexerEntity indexer = new IndexerEntity(name);
        indexer.setId(id);
        return indexer;
    }

    private IndexerSearchEntity indexerSearch(IndexerEntity indexer, int id) {
        IndexerSearchEntity indexerSearch = new IndexerSearchEntity(indexer, search, id);
        indexerSearch.setSuccessful(true);
        return indexerSearch;
    }

    private SearchResultEntity result(IndexerEntity indexer, String title) {
        return new SearchResultEntity(indexer, Instant.now(), title, "guid", "link", "details", DownloadType.NZB, Instant.now());
    }

    private IndexerSearchResultOccurrenceEntity occurrence(IndexerSearchEntity indexerSearch, SearchResultEntity result) {
        return new IndexerSearchResultOccurrenceEntity(indexerSearch, result);
    }
}
