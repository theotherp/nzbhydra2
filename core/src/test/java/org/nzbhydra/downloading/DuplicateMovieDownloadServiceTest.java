package org.nzbhydra.downloading;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.indexers.IndexerSearchEntity;
import org.nzbhydra.indexers.IndexerSearchRepository;
import org.nzbhydra.searching.db.IdentifierKeyValuePair;
import org.nzbhydra.searching.db.SearchEntity;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.springframework.test.util.ReflectionTestUtils;

import java.security.Principal;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DuplicateMovieDownloadServiceTest {

    @Mock
    private FileDownloadRepository fileDownloadRepository;
    @Mock
    private SearchResultRepository searchResultRepository;
    @Mock
    private IndexerSearchRepository indexerSearchRepository;
    @Mock
    private Principal principal;

    @InjectMocks
    private DuplicateMovieDownloadService testee;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(testee, "duplicateMovieDownloadEnabled", true);
        ReflectionTestUtils.setField(testee, "duplicateMovieDownloadTimeSpan", Duration.ofMinutes(15));
        when(principal.getName()).thenReturn("user");
    }

    @Test
    void shouldRequireReasonWhenLatestMatchingMovieDownloadDidNotFail() {
        SearchEntity currentSearch = movieSearch("123", "Avengers", null);
        SearchEntity recentSearch = movieSearch("123", null, "different query");

        SearchResultEntity currentResult = searchResult(1L, 11);
        SearchResultEntity recentResult = searchResult(2L, 12);

        FileDownloadEntity recentDownload = download(recentResult, FileDownloadStatus.NZB_ADDED);

        mockRepositories(currentResult, recentDownload, currentSearch, recentSearch);

        DuplicateMovieDownloadCheckResponse response = testee.checkIfReasonIsRequired(requestFor(currentResult), principal);

        assertThat(response.isReasonRequired()).isTrue();
    }

    @Test
    void shouldNotRequireReasonWhenLatestMatchingMovieDownloadFailed() {
        SearchEntity currentSearch = movieSearch("123", "Avengers", null);
        SearchEntity latestFailedSearch = movieSearch("123", null, "ignored");
        SearchEntity olderSuccessfulSearch = movieSearch("123", null, "ignored");

        SearchResultEntity currentResult = searchResult(1L, 11);
        SearchResultEntity latestFailedResult = searchResult(2L, 12);
        SearchResultEntity olderSuccessfulResult = searchResult(3L, 13);

        FileDownloadEntity latestFailedDownload = download(latestFailedResult, FileDownloadStatus.CONTENT_DOWNLOAD_ERROR);
        FileDownloadEntity olderSuccessfulDownload = download(olderSuccessfulResult, FileDownloadStatus.NZB_ADDED);

        when(searchResultRepository.findAllById(List.of(1L))).thenReturn(List.of(currentResult));
        when(fileDownloadRepository.findByUsernameAndTimeAfterOrderByTimeDesc(eq("user"), any(Instant.class)))
                .thenReturn(List.of(latestFailedDownload, olderSuccessfulDownload));
        when(indexerSearchRepository.findAllById(Set.of(11))).thenReturn(List.of(indexerSearchEntity(11, currentSearch)));
        when(indexerSearchRepository.findAllById(Set.of(12, 13))).thenReturn(List.of(
                indexerSearchEntity(12, latestFailedSearch),
                indexerSearchEntity(13, olderSuccessfulSearch)
        ));

        DuplicateMovieDownloadCheckResponse response = testee.checkIfReasonIsRequired(requestFor(currentResult), principal);

        assertThat(response.isReasonRequired()).isFalse();
    }

    @Test
    void shouldRequireReasonWhenRecentMovieSearchQueryMatchesTitle() {
        SearchEntity currentSearch = movieSearch(null, "The Matrix", null);
        SearchEntity recentSearch = movieSearch(null, null, "The Matrix");

        SearchResultEntity currentResult = searchResult(1L, 11);
        SearchResultEntity recentResult = searchResult(2L, 12);

        FileDownloadEntity recentDownload = download(recentResult, FileDownloadStatus.CONTENT_DOWNLOAD_WARNING);

        mockRepositories(currentResult, recentDownload, currentSearch, recentSearch);

        DuplicateMovieDownloadCheckResponse response = testee.checkIfReasonIsRequired(requestFor(currentResult), principal);

        assertThat(response.isReasonRequired()).isTrue();
    }

    @Test
    void shouldRequireReasonWhenGenericSearchQueryContainsRecentlyDownloadedMovieTitle() {
        SearchEntity currentSearch = genericSearch("Interstellar 2014 2160p");
        SearchEntity recentSearch = movieSearch("157336", "Interstellar", null);

        SearchResultEntity currentResult = searchResult(1L, 11);
        SearchResultEntity recentResult = searchResult(2L, 12);

        FileDownloadEntity recentDownload = download(recentResult, FileDownloadStatus.NZB_ADDED);

        mockRepositories(currentResult, recentDownload, currentSearch, recentSearch);

        DuplicateMovieDownloadCheckResponse response = testee.checkIfReasonIsRequired(requestFor(currentResult), principal);

        assertThat(response.isReasonRequired()).isTrue();
    }

    private void mockRepositories(SearchResultEntity currentResult, FileDownloadEntity recentDownload, SearchEntity currentSearch, SearchEntity recentSearch) {
        when(searchResultRepository.findAllById(List.of(currentResult.getId()))).thenReturn(List.of(currentResult));
        when(fileDownloadRepository.findByUsernameAndTimeAfterOrderByTimeDesc(eq("user"), any(Instant.class))).thenReturn(List.of(recentDownload));
        when(indexerSearchRepository.findAllById(Set.of(currentResult.getIndexerSearchEntityId()))).thenReturn(List.of(indexerSearchEntity(currentResult.getIndexerSearchEntityId(), currentSearch)));
        when(indexerSearchRepository.findAllById(Set.of(recentDownload.getSearchResult().getIndexerSearchEntityId()))).thenReturn(List.of(indexerSearchEntity(recentDownload.getSearchResult().getIndexerSearchEntityId(), recentSearch)));
    }

    private AddFilesRequest requestFor(SearchResultEntity searchResult) {
        AddFilesRequest.SearchResult result = new AddFilesRequest.SearchResult(String.valueOf(searchResult.getId()), null, null);
        return new AddFilesRequest("downloader", List.of(result), null, null);
    }

    private SearchEntity movieSearch(String tmdbId, String title, String query) {
        SearchEntity entity = new SearchEntity();
        entity.setSearchType(SearchType.MOVIE);
        entity.setTitle(title);
        entity.setQuery(query);
        if (tmdbId != null) {
            entity.setIdentifiers(Set.of(new IdentifierKeyValuePair("TMDB", tmdbId)));
        }
        return entity;
    }

    private SearchEntity genericSearch(String query) {
        SearchEntity entity = new SearchEntity();
        entity.setSearchType(SearchType.SEARCH);
        entity.setQuery(query);
        return entity;
    }

    private SearchResultEntity searchResult(long id, int indexerSearchId) {
        SearchResultEntity entity = new SearchResultEntity();
        entity.setId(id);
        entity.setIndexerSearchEntityId(indexerSearchId);
        return entity;
    }

    private FileDownloadEntity download(SearchResultEntity searchResult, FileDownloadStatus status) {
        FileDownloadEntity entity = new FileDownloadEntity();
        entity.setSearchResult(searchResult);
        entity.setStatus(status);
        entity.setTime(Instant.now());
        return entity;
    }

    private IndexerSearchEntity indexerSearchEntity(int id, SearchEntity searchEntity) {
        IndexerSearchEntity entity = new IndexerSearchEntity();
        entity.setId(id);
        entity.setSearchEntity(searchEntity);
        return entity;
    }
}
