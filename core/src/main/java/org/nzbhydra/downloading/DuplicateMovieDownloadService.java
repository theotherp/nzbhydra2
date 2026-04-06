package org.nzbhydra.downloading;

import com.google.common.base.Strings;
import org.nzbhydra.config.mediainfo.MediaIdType;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.indexers.IndexerSearchEntity;
import org.nzbhydra.indexers.IndexerSearchRepository;
import org.nzbhydra.mediainfo.Imdb;
import org.nzbhydra.searching.db.SearchEntity;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class DuplicateMovieDownloadService {

    private static final Logger logger = LoggerFactory.getLogger(DuplicateMovieDownloadService.class);
    private static final Set<FileDownloadStatus> FAILED_STATUSES = Set.of(
            FileDownloadStatus.NZB_DOWNLOAD_ERROR,
            FileDownloadStatus.NZB_ADD_ERROR,
            FileDownloadStatus.NZB_ADD_REJECTED,
            FileDownloadStatus.CONTENT_DOWNLOAD_ERROR
    );

    @Autowired
    private FileDownloadRepository fileDownloadRepository;

    @Autowired
    private SearchResultRepository searchResultRepository;

    @Autowired
    private IndexerSearchRepository indexerSearchRepository;

    @Value("${nzbhydra.duplicateMovieDownload.enabled:false}")
    private boolean duplicateMovieDownloadEnabled;

    @Value("${nzbhydra.duplicateMovieDownload.timeSpan:PT15M}")
    private Duration duplicateMovieDownloadTimeSpan;

    public DuplicateMovieDownloadCheckResponse checkIfReasonIsRequired(AddFilesRequest request, Principal principal) {
        if (!duplicateMovieDownloadEnabled) {
            return new DuplicateMovieDownloadCheckResponse(false);
        }

        List<MovieSearchCandidate> candidates = getMovieSearchCandidates(request);
        if (candidates.isEmpty()) {
            return new DuplicateMovieDownloadCheckResponse(false);
        }

        List<HistoricalMovieDownload> recentDownloads = getRecentMovieDownloads(principal);
        for (MovieSearchCandidate candidate : candidates) {
            Optional<HistoricalMovieDownload> latestMatchingDownload = recentDownloads.stream()
                    .filter(download -> matches(candidate, download))
                    .findFirst();
            if (latestMatchingDownload.isPresent() && !FAILED_STATUSES.contains(latestMatchingDownload.get().status())) {
                return new DuplicateMovieDownloadCheckResponse(true);
            }
        }

        return new DuplicateMovieDownloadCheckResponse(false);
    }

    public void logReasonIfEntered(AddFilesRequest request, Principal principal) {
        String reason = Strings.emptyToNull(request.getReason());
        if (!duplicateMovieDownloadEnabled || reason == null) {
            return;
        }

        logger.info(
                "Duplicate movie download reason from user {} for downloader {} and {} result(s): {}",
                getRelevantUsername(principal),
                request.getDownloaderName(),
                request.getSearchResults() == null ? 0 : request.getSearchResults().size(),
                reason.trim()
        );
    }

    private List<MovieSearchCandidate> getMovieSearchCandidates(AddFilesRequest request) {
        List<SearchResultEntity> selectedSearchResults = getSearchResults(request == null ? List.of() : request.getSearchResults());
        if (selectedSearchResults.isEmpty()) {
            return List.of();
        }

        Map<Integer, SearchEntity> searchesByIndexerSearchId = getSearchesByIndexerSearchId(selectedSearchResults);
        return selectedSearchResults.stream()
                .map(searchResult -> searchesByIndexerSearchId.get(searchResult.getIndexerSearchEntityId()))
                .filter(Objects::nonNull)
                .map(searchEntity -> new MovieSearchCandidate(
                        searchEntity.getSearchType(),
                        extractMovieIdentifiers(searchEntity),
                        normalizeText(getMovieTitle(searchEntity)),
                        normalizeText(searchEntity.getQuery())
                ))
                .filter(this::isRelevantCandidate)
                .distinct()
                .toList();
    }

    private List<HistoricalMovieDownload> getRecentMovieDownloads(Principal principal) {
        Instant earliestDownloadTime = Instant.now().minus(duplicateMovieDownloadTimeSpan);
        String username = getRelevantUsername(principal);
        List<FileDownloadEntity> recentDownloads = username == null
                ? fileDownloadRepository.findByTimeAfterOrderByTimeDesc(earliestDownloadTime)
                : fileDownloadRepository.findByUsernameAndTimeAfterOrderByTimeDesc(username, earliestDownloadTime);

        Map<Integer, SearchEntity> searchesByIndexerSearchId = getSearchesByIndexerSearchId(recentDownloads.stream()
                .map(FileDownloadEntity::getSearchResult)
                .filter(Objects::nonNull)
                .toList());

        return recentDownloads.stream()
                .map(download -> toHistoricalMovieDownload(download, searchesByIndexerSearchId))
                .filter(Objects::nonNull)
                .toList();
    }

    private HistoricalMovieDownload toHistoricalMovieDownload(FileDownloadEntity download, Map<Integer, SearchEntity> searchesByIndexerSearchId) {
        SearchResultEntity searchResult = download.getSearchResult();
        if (searchResult == null || searchResult.getIndexerSearchEntityId() == null) {
            return null;
        }
        SearchEntity searchEntity = searchesByIndexerSearchId.get(searchResult.getIndexerSearchEntityId());
        if (searchEntity == null || searchEntity.getSearchType() != SearchType.MOVIE) {
            return null;
        }

        return new HistoricalMovieDownload(
                extractMovieIdentifiers(searchEntity),
                normalizeText(getMovieTitle(searchEntity)),
                normalizeText(searchEntity.getQuery()),
                download.getStatus()
        );
    }

    private Map<Integer, SearchEntity> getSearchesByIndexerSearchId(Collection<SearchResultEntity> searchResults) {
        Set<Integer> indexerSearchIds = searchResults.stream()
                .map(SearchResultEntity::getIndexerSearchEntityId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        return indexerSearchRepository.findAllById(indexerSearchIds).stream()
                .collect(Collectors.toMap(IndexerSearchEntity::getId, IndexerSearchEntity::getSearchEntity));
    }

    private List<SearchResultEntity> getSearchResults(List<AddFilesRequest.SearchResult> searchResults) {
        List<Long> ids = searchResults.stream()
                .map(AddFilesRequest.SearchResult::getSearchResultId)
                .map(this::parseSearchResultId)
                .filter(Objects::nonNull)
                .toList();
        if (ids.isEmpty()) {
            return List.of();
        }
        return searchResultRepository.findAllById(ids);
    }

    private Long parseSearchResultId(String id) {
        try {
            return Long.parseLong(id);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private boolean matches(MovieSearchCandidate candidate, HistoricalMovieDownload download) {
        return hasMatchingIdentifier(candidate, download) || hasMatchingTitleQuery(candidate, download);
    }

    private boolean hasMatchingIdentifier(MovieSearchCandidate candidate, HistoricalMovieDownload download) {
        if (candidate.identifiers().isEmpty() || download.identifiers().isEmpty()) {
            return false;
        }
        return candidate.identifiers().stream().anyMatch(download.identifiers()::contains);
    }

    private boolean hasMatchingTitleQuery(MovieSearchCandidate candidate, HistoricalMovieDownload download) {
        if (candidate.searchType() == SearchType.MOVIE) {
            return candidate.movieTitle() != null && candidate.movieTitle().equals(download.query());
        }

        return candidate.query() != null
               && download.movieTitle() != null
               && candidate.query().contains(download.movieTitle());
    }

    private boolean isRelevantCandidate(MovieSearchCandidate candidate) {
        if (candidate.searchType() == SearchType.MOVIE) {
            return !candidate.identifiers().isEmpty() || candidate.movieTitle() != null;
        }

        return candidate.query() != null;
    }

    private Set<String> extractMovieIdentifiers(SearchEntity searchEntity) {
        return searchEntity.getIdentifiers().stream()
                .map(identifier -> normalizeIdentifier(identifier.getIdentifierKey(), identifier.getIdentifierValue()))
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    private String normalizeIdentifier(String key, String value) {
        if (Strings.isNullOrEmpty(key) || Strings.isNullOrEmpty(value)) {
            return null;
        }
        String normalizedKey = key.toUpperCase(Locale.ROOT);
        String normalizedValue = value.trim();
        if (MediaIdType.IMDB.name().equals(normalizedKey)) {
            normalizedValue = Imdb.withTt(normalizedValue);
        }
        if (Strings.isNullOrEmpty(normalizedValue)) {
            return null;
        }
        return normalizedKey + ":" + normalizedValue;
    }

    private String getMovieTitle(SearchEntity searchEntity) {
        if (!Strings.isNullOrEmpty(searchEntity.getTitle())) {
            return searchEntity.getTitle();
        }
        return searchEntity.getQuery();
    }

    private String normalizeText(String value) {
        return Strings.isNullOrEmpty(value) ? null : value.trim().toLowerCase(Locale.ROOT);
    }

    private String getRelevantUsername(Principal principal) {
        if (principal == null || Strings.isNullOrEmpty(principal.getName()) || "anonymousUser".equals(principal.getName())) {
            return null;
        }
        return principal.getName();
    }

    private record MovieSearchCandidate(SearchType searchType, Set<String> identifiers, String movieTitle, String query) {
    }

    private record HistoricalMovieDownload(Set<String> identifiers, String movieTitle, String query, FileDownloadStatus status) {
    }
}
