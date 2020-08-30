package org.nzbhydra.api;

import com.google.common.base.Stopwatch;
import com.google.common.base.Strings;
import com.google.common.base.Throwables;
import com.google.common.collect.Sets;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.apache.catalina.connector.ClientAbortException;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.category.CategoriesConfig;
import org.nzbhydra.downloading.DownloadResult;
import org.nzbhydra.downloading.FileHandler;
import org.nzbhydra.downloading.InvalidSearchResultIdException;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mapping.newznab.NewznabParameters;
import org.nzbhydra.mapping.newznab.NewznabResponse;
import org.nzbhydra.mapping.newznab.OutputType;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlError;
import org.nzbhydra.mediainfo.Imdb;
import org.nzbhydra.mediainfo.MediaIdType;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.SearchResult;
import org.nzbhydra.searching.Searcher;
import org.nzbhydra.searching.dtoseventsenums.DownloadType;
import org.nzbhydra.searching.dtoseventsenums.SearchType;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.nzbhydra.searching.searchrequests.SearchRequestFactory;
import org.nzbhydra.web.SessionStorage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.Comparator;
import java.util.Map.Entry;
import java.util.Objects;
import java.util.Optional;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;

@RestController
public class ExternalApi {

    private static final int MAX_CACHE_SIZE = 5;
    private static final int MAX_CACHE_AGE_HOURS = 24;

    private static final Logger logger = LoggerFactory.getLogger(ExternalApi.class);

    @Value("${nzbhydra.dev.noApiKey:false}")
    private final boolean noApiKeyNeeded = false;

    @Autowired
    protected Searcher searcher;
    @Autowired
    protected SearchRequestFactory searchRequestFactory;
    @Autowired
    protected FileHandler fileHandler;
    @Autowired
    protected ConfigProvider configProvider;
    @Autowired
    private NewznabXmlTransformer newznabXmlTransformer;
    @Autowired
    private NewznabJsonTransformer newznabJsonTransformer;
    @Autowired
    private CategoryProvider categoryProvider;
    @Autowired
    private CapsGenerator capsGenerator;
    @Autowired
    private MockSearch mockSearch;
    protected Clock clock = Clock.systemUTC();
    private final Random random = new Random();

    private final ConcurrentMap<Integer, CacheEntryValue> cache = new ConcurrentHashMap<>();

    //When enabled search results will be mocked instead of indexers actually being searched. Only for configuration of external tools
    private static boolean inMockingMode;

    /**
     * External API call.
     *
     * @param params      Parameters as defined in {@link NewznabParameters}.
     * @param indexerName If defined the name of a configured indexer that should be used for the search.
     * @param mock        If set to any value then the search should be mocked (will return a number of mocked results).
     * @return Newznab results.
     */
    @RequestMapping(value = {"/api", "/rss", "/torznab/api", "/torznab/api/{indexerName}", "/api/{indexerName}"}, consumes = MediaType.ALL_VALUE)
    public ResponseEntity<? extends Object> api(NewznabParameters params, @PathVariable(value = "indexerName", required = false) String indexerName, @PathVariable(value = "mock", required = false) String mock) throws Exception {
        int searchRequestId = random.nextInt(100000);
        if (params.getT() != null && params.getT().isSearch()) {
            MDC.put("SEARCH", String.valueOf(searchRequestId));
        }
        NewznabResponse.SearchType searchType = getSearchType();
        logger.info("Received external {} API call: {}", searchType.name().toLowerCase(), params);

        if (!noApiKeyNeeded && !Objects.equals(params.getApikey(), configProvider.getBaseConfig().getMain().getApiKey())) {
            logger.error("Received API call with wrong API key");
            throw new WrongApiKeyException("Wrong api key");
        }

        if (!params.getIndexers().isEmpty() && indexerName != null) {
            logger.error("Received call with parameters set in path and request variables");
            NewznabXmlError error = new NewznabXmlError("200", "Received call with parameters set in path and request variables");
            return new ResponseEntity<Object>(error, HttpStatus.OK);
        } else if (indexerName != null) {
            params.setIndexers(Sets.newHashSet(indexerName));
        }

        if (params.getT() == ActionAttribute.CAPS) {
            return capsGenerator.getCaps(params.getO(), searchType);
        }

        if (Stream.of(ActionAttribute.SEARCH, ActionAttribute.BOOK, ActionAttribute.TVSEARCH, ActionAttribute.MOVIE).anyMatch(x -> x == params.getT())) {
            if (inMockingMode) {
                logger.debug("Will mock results for this request");
                return new ResponseEntity<>(mockSearch.mockSearch(params, getSearchType() == NewznabResponse.SearchType.NEWZNAB), HttpStatus.OK);
            }

            if (params.getCachetime() != null || configProvider.getBaseConfig().getSearching().getGlobalCacheTimeMinutes().isPresent()) {
                return handleCachingSearch(params, searchType, searchRequestId);
            }

            NewznabResponse searchResult = search(params, searchRequestId);
            HttpHeaders httpHeaders = setSearchTypeAndGetHeaders(params, searchResult);
            return new ResponseEntity<>(searchResult, httpHeaders, HttpStatus.OK);
        }

        if (params.getT() == ActionAttribute.GET) {
            return getNzb(params);
        }


        logger.error("Incorrect API request: {}", params);
        NewznabXmlError error = new NewznabXmlError("200", "Unknown or incorrect parameter");
        return new ResponseEntity<Object>(error, HttpStatus.OK);
    }

    public static void setInMockingMode(boolean newValue) {
        inMockingMode = newValue;
    }

    private HttpHeaders setSearchTypeAndGetHeaders(NewznabParameters params, NewznabResponse newznabResponse) {
        HttpHeaders httpHeaders = new HttpHeaders();
        httpHeaders.set(HttpHeaders.CONTENT_TYPE, newznabResponse.getContentHeader());
        if (params.getO() != OutputType.JSON && newznabResponse.getSearchType() == null) {
            newznabResponse.setSearchType(getSearchType());
        }
        return httpHeaders;
    }

    protected ResponseEntity<?> handleCachingSearch(NewznabParameters params, NewznabResponse.SearchType searchType, int searchRequestId) {
        //Remove old entries
        cache.entrySet().removeIf(x -> x.getValue().getLastUpdate().isBefore(clock.instant().minus(MAX_CACHE_AGE_HOURS, ChronoUnit.HOURS)));

        CacheEntryValue cacheEntryValue;
        int cacheKey = params.cacheKey(searchType);
        if (cache.containsKey(cacheKey)) {
            cacheEntryValue = cache.get(cacheKey);
            int cachetime = params.getCachetime() == null ? configProvider.getBaseConfig().getSearching().getGlobalCacheTimeMinutes().get() : params.getCachetime();
            if (cacheEntryValue.getLastUpdate().isAfter(clock.instant().minus(cachetime, ChronoUnit.MINUTES))) {
                Instant nextUpdate = cacheEntryValue.getLastUpdate().plus(cachetime, ChronoUnit.MINUTES);
                logger.info("Returning cached search result. Next update of search will be done at {}", LocalDateTime.ofInstant(nextUpdate, ZoneId.systemDefault()));
                NewznabResponse searchResult = cacheEntryValue.getSearchResult();

                HttpHeaders httpHeaders = setSearchTypeAndGetHeaders(params, searchResult);
                return new ResponseEntity<>(searchResult, httpHeaders, HttpStatus.OK);
            } else {
                logger.info("Updating search because cache time is exceeded");
            }
        }
        //Remove oldest entry when max size is reached
        if (cache.size() == MAX_CACHE_SIZE) {
            Optional<Entry<Integer, CacheEntryValue>> keyToEvict = cache.entrySet().stream().min(Comparator.comparing(o -> o.getValue().getLastUpdate()));
            //Should always be the case anyway
            logger.info("Removing oldest entry from cache because its limit of {} is reached", MAX_CACHE_SIZE);
            keyToEvict.ifPresent(newznabParametersCacheEntryValueEntry -> cache.remove(newznabParametersCacheEntryValueEntry.getKey()));
        }

        NewznabResponse searchResult = search(params, searchRequestId);
        logger.info("Putting search result into cache");
        cache.put(cacheKey, new CacheEntryValue(params, clock.instant(), searchResult));
        HttpHeaders httpHeaders = setSearchTypeAndGetHeaders(params, searchResult);
        return new ResponseEntity<>(searchResult, httpHeaders, HttpStatus.OK);
    }


    protected ResponseEntity<?> getNzb(NewznabParameters params) throws MissingParameterException, UnknownErrorException {
        if (Strings.isNullOrEmpty(params.getId())) {
            throw new MissingParameterException("Missing ID/GUID");
        }
        DownloadResult downloadResult;
        try {

            downloadResult = fileHandler.getFileByGuid(Long.parseLong(params.getId()), configProvider.getBaseConfig().getDownloading().getNzbAccessType(), SearchSource.API);
        } catch (InvalidSearchResultIdException e) {
            return ResponseEntity.ok().contentType(MediaType.APPLICATION_XML).body("<error code=\"300\" description=\"Invalid or outdated search result ID\"/>");
        }
        if (!downloadResult.isSuccessful()) {
            throw new UnknownErrorException(downloadResult.getError());
        }

        return downloadResult.getAsResponseEntity();
    }

    protected NewznabResponse search(NewznabParameters params, int searchRequestId) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        SearchRequest searchRequest = buildBaseSearchRequest(params, searchRequestId);
        if (getSearchType() == NewznabResponse.SearchType.TORZNAB) {
            searchRequest.setDownloadType(DownloadType.TORRENT);
        } else {
            searchRequest.setDownloadType(DownloadType.NZB);
        }
        SearchResult searchResult = searcher.search(searchRequest);

        NewznabResponse transformedResults = transformResults(searchResult, params, searchRequest);
        logger.info("Search took {}ms. Returning {} results", stopwatch.elapsed(TimeUnit.MILLISECONDS), searchResult.getSearchResultItems().size());
        return transformedResults;
    }

    private NewznabResponse.SearchType getSearchType() {
        boolean torznab = SessionStorage.requestUrl.get() != null && SessionStorage.requestUrl.get().toLowerCase().contains("/torznab");
        return torznab ? NewznabResponse.SearchType.TORZNAB : NewznabResponse.SearchType.NEWZNAB;
    }

    @ExceptionHandler(value = ExternalApiException.class)
    public NewznabXmlError handler(ExternalApiException e) {
        NewznabXmlError error = new NewznabXmlError(e.getStatusCode(), e.getMessage());
        return error;
    }

    @ExceptionHandler(value = Exception.class)
    public ResponseEntity handleUnexpectedError(Exception e) {
        if (e instanceof ClientAbortException || Throwables.getCausalChain(e).stream().anyMatch(x -> x instanceof ClientAbortException)) {
            logger.warn("Calling tool closed the connection before getting the results");
            return null; //Can't return anything because the connection is closed, obviously
        }
        try {
            logger.error("Unexpected error while handling API request", e);
            if (configProvider.getBaseConfig().getSearching().isWrapApiErrors()) {
                logger.debug("Wrapping error in empty search result");
                return ResponseEntity.status(200).body(newznabXmlTransformer.getRssRoot(Collections.emptyList(), 0, 0, false));
            } else {
                NewznabXmlError error = new NewznabXmlError("900", e.getMessage());
                return ResponseEntity.status(200).body(error);
            }
        } catch (Exception e1) {
            return ResponseEntity.status(200).body("<error code=\"900\" description=\"" + e.getMessage() + "\"");
        }
    }


    protected NewznabResponse transformResults(SearchResult searchResult, NewznabParameters params, SearchRequest searchRequest) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        NewznabResponse response;
        int total = searchResult.getNumberOfTotalAvailableResults() - searchResult.getNumberOfRejectedResults() - searchResult.getNumberOfRemovedDuplicates();
        if (params.getO() == OutputType.JSON) {
            response = newznabJsonTransformer.transformToRoot(searchResult.getSearchResultItems(), params.getOffset(), total, searchRequest.getDownloadType() == DownloadType.NZB);
        } else {
            response = newznabXmlTransformer.getRssRoot(searchResult.getSearchResultItems(), params.getOffset(), total, searchRequest.getDownloadType() == DownloadType.NZB);
        }
        logger.debug(LoggingMarkers.PERFORMANCE, "Transforming results took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return response;
    }


    private SearchRequest buildBaseSearchRequest(NewznabParameters params, int searchRequestId) {
        SearchType searchType = SearchType.valueOf(params.getT().name());
        SearchRequest searchRequest = searchRequestFactory.getSearchRequest(searchType, SearchSource.API, categoryProvider.fromSearchNewznabCategories(params.getCat(), CategoriesConfig.allCategory), searchRequestId, params.getOffset(), params.getLimit());
        logger.info("Executing new search");
        searchRequest.setQuery(params.getQ());
        searchRequest.setLimit(params.getLimit());
        searchRequest.setOffset(params.getOffset());
        searchRequest.setMinage(params.getMinage()); //Not part of spec
        searchRequest.setMaxage(params.getMaxage());
        searchRequest.setMinsize(params.getMinsize()); //Not part of spec
        searchRequest.setMaxsize(params.getMaxsize()); //Not part of spec
        searchRequest.setAuthor(params.getAuthor());
        searchRequest.setTitle(params.getTitle());
        searchRequest.setSeason(params.getSeason());
        searchRequest.setEpisode(params.getEp());
        if (params.getIndexers() != null && !params.getIndexers().isEmpty()) {
            searchRequest.setIndexers(params.getIndexers());
        }
        if (params.getCat() != null) {
            searchRequest.getInternalData().setNewznabCategories(params.getCat());
        }

        if (!Strings.isNullOrEmpty(params.getTvdbid())) {
            searchRequest.getIdentifiers().put(MediaIdType.TVDB, params.getTvdbid());
        }
        if (!Strings.isNullOrEmpty(params.getTvmazeid())) {
            searchRequest.getIdentifiers().put(MediaIdType.TVMAZE, params.getTvmazeid());
        }
        if (!Strings.isNullOrEmpty(params.getRid())) {
            searchRequest.getIdentifiers().put(MediaIdType.TVRAGE, params.getRid());
        }
        if (!Strings.isNullOrEmpty(params.getImdbid()) && searchType == SearchType.MOVIE) {
            searchRequest.getIdentifiers().put(MediaIdType.IMDB, Imdb.withTt(params.getImdbid()));
        }
        if (!Strings.isNullOrEmpty(params.getImdbid()) && searchType == SearchType.TVSEARCH) {
            searchRequest.getIdentifiers().put(MediaIdType.TVIMDB, Imdb.withTt(params.getImdbid()));
        }
        if (!Strings.isNullOrEmpty(params.getTmdbid())) {
            searchRequest.getIdentifiers().put(MediaIdType.TMDB, params.getTmdbid());
        }
        if (params.getPassword() != null && params.getPassword() == 1) {
            searchRequest.getInternalData().setIncludePasswords(true);
        }
        searchRequest = searchRequestFactory.extendWithSavedIdentifiers(searchRequest);

        return searchRequest;
    }


    @Data
    @AllArgsConstructor
    private static class CacheEntryValue {
        private final NewznabParameters params;
        private final Instant lastUpdate;
        private final NewznabResponse searchResult;

        @Override
        public boolean equals(Object o) {
            if (this == o) {
                return true;
            }
            if (o == null || getClass() != o.getClass()) {
                return false;
            }
            CacheEntryValue that = (CacheEntryValue) o;
            return com.google.common.base.Objects.equal(params, that.params) &&
                    com.google.common.base.Objects.equal(lastUpdate, that.lastUpdate) &&
                    com.google.common.base.Objects.equal(searchResult, that.searchResult);
        }

        @Override
        public int hashCode() {
            return com.google.common.base.Objects.hashCode(super.hashCode(), params, lastUpdate, searchResult);
        }
    }

}
