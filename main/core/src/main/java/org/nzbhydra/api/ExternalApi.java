package org.nzbhydra.api;

import com.google.common.base.Stopwatch;
import com.google.common.base.Strings;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.nzbhydra.config.CategoriesConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.downloading.NzbDownloadResult;
import org.nzbhydra.downloading.NzbHandler;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mapping.newznab.Enclosure;
import org.nzbhydra.mapping.newznab.NewznabAttribute;
import org.nzbhydra.mapping.newznab.NewznabParameters;
import org.nzbhydra.mapping.newznab.NewznabResponse;
import org.nzbhydra.mapping.newznab.RssChannel;
import org.nzbhydra.mapping.newznab.RssError;
import org.nzbhydra.mapping.newznab.RssGuid;
import org.nzbhydra.mapping.newznab.RssItem;
import org.nzbhydra.mapping.newznab.RssRoot;
import org.nzbhydra.mapping.newznab.Xml;
import org.nzbhydra.mapping.newznab.caps.CapsLimits;
import org.nzbhydra.mapping.newznab.caps.CapsRetention;
import org.nzbhydra.mapping.newznab.caps.CapsRoot;
import org.nzbhydra.mapping.newznab.caps.CapsSearch;
import org.nzbhydra.mapping.newznab.caps.CapsSearching;
import org.nzbhydra.mapping.newznab.caps.CapsServer;
import org.nzbhydra.mediainfo.InfoProvider.IdType;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.SearchResult;
import org.nzbhydra.searching.SearchResultItem;
import org.nzbhydra.searching.SearchResultItem.DownloadType;
import org.nzbhydra.searching.SearchType;
import org.nzbhydra.searching.Searcher;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.nzbhydra.searching.searchrequests.SearchRequestFactory;
import org.nzbhydra.web.UsernameOrIpStorage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map.Entry;
import java.util.Objects;
import java.util.Optional;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@RestController
public class ExternalApi {

    private static final int MAX_CACHE_SIZE = 5;
    private static final int MAX_CACHE_AGE_HOURS = 24;
    private static final List<String> USER_AGENTS = Arrays.asList("Sonarr", "Radarr", "CouchPotato", "LazyLibrarian", "Mozilla");

    private static final Logger logger = LoggerFactory.getLogger(ExternalApi.class);

    @Value("${nzbhydra.dev.noApiKey:false}")
    private boolean noApiKeyNeeded = false;

    @Autowired
    protected Searcher searcher;
    @Autowired
    protected SearchRequestFactory searchRequestFactory;
    @Autowired
    protected NzbHandler nzbHandler;
    @Autowired
    protected ConfigProvider configProvider;
    @Autowired
    private CategoryProvider categoryProvider;
    protected Clock clock = Clock.systemUTC();
    private Random random = new Random();

    private ConcurrentMap<Integer, CacheEntryValue> cache = new ConcurrentHashMap<>();


    @RequestMapping(value = {"/api", "/rss", "/torznab/api"}, produces = MediaType.APPLICATION_RSS_XML_VALUE, consumes = MediaType.ALL_VALUE)
    public ResponseEntity<? extends Object> api(NewznabParameters params, HttpServletRequest request) throws Exception {
        logger.info("Received external {}API call: {}", (isTorznabCall(request) ? "torznab " : ""), params);

        if (!noApiKeyNeeded && !Objects.equals(params.getApikey(), configProvider.getBaseConfig().getMain().getApiKey())) {
            logger.error("Received API call with wrong API key");
            throw new WrongApiKeyException("Wrong api key");
        }

        if (Stream.of(ActionAttribute.SEARCH, ActionAttribute.BOOK, ActionAttribute.TVSEARCH, ActionAttribute.MOVIE).anyMatch(x -> x == params.getT())) {
            if (params.getCachetime() != null) {
                return handleCachingSearch(params, request);
            }
            RssRoot searchResult = search(params, request);
            return new ResponseEntity<>(searchResult, HttpStatus.OK);
        }

        if (params.getT() == ActionAttribute.GET) {
            return getNzb(params);
        }

        if (params.getT() == ActionAttribute.CAPS) {
            return getCaps();
        }

        logger.error("Incorrect API request: {}", params);
        RssError error = new RssError("200", "Unknown or incorrect parameter");
        return new ResponseEntity<Object>(error, HttpStatus.OK);
    }


    protected ResponseEntity<?> handleCachingSearch(NewznabParameters params, HttpServletRequest request) {
        //Remove old entries
        cache.entrySet().removeIf(x -> x.getValue().getLastUpdate().isBefore(clock.instant().minus(MAX_CACHE_AGE_HOURS, ChronoUnit.HOURS)));

        CacheEntryValue cacheEntryValue;
        if (cache.containsKey(params.cacheKey())) {
            cacheEntryValue = cache.get(params.cacheKey());
            if (cacheEntryValue.getLastUpdate().isAfter(clock.instant().minus(params.getCachetime(), ChronoUnit.MINUTES))) {
                Instant nextUpdate = cacheEntryValue.getLastUpdate().plus(params.getCachetime(), ChronoUnit.MINUTES);
                logger.info("Returning cached search result. Next update of search will be done at {}", nextUpdate);
                return new ResponseEntity<>(cacheEntryValue.getSearchResult(), HttpStatus.OK);
            } else {
                logger.info("Updating search because cache time is exceeded");
            }
        }
        //Remove oldest entry when max size is reached
        if (cache.size() == MAX_CACHE_SIZE) {
            Optional<Entry<Integer, CacheEntryValue>> keyToEvict = cache.entrySet().stream().sorted(Comparator.comparing(o -> o.getValue().getLastUpdate())).findFirst();
            //Should always be the case anyway
            logger.info("Removing oldest entry from cache because its limit of {} is reached", MAX_CACHE_SIZE);
            keyToEvict.ifPresent(newznabParametersCacheEntryValueEntry -> cache.remove(newznabParametersCacheEntryValueEntry.getKey()));
        }

        RssRoot searchResult = search(params, request);
        logger.info("Putting search result into cache");
        cache.put(params.cacheKey(), new CacheEntryValue(params, clock.instant(), searchResult));
        return new ResponseEntity<>(searchResult, HttpStatus.OK);
    }

    protected ResponseEntity<?> getCaps() {
        CapsRoot capsRoot = new CapsRoot();
        capsRoot.setRetention(new CapsRetention(3000));
        capsRoot.setLimits(new CapsLimits(100, 100)); //later link to global setting when implemented

        CapsServer capsServer = new CapsServer();
        capsServer.setEmail("theotherp@gmx.de");
        capsServer.setTitle("NZBHydra 2");
        capsServer.setUrl("https://github.com/theotherp/nzbhydra2");
        capsRoot.setServer(capsServer);

        CapsSearching capsSearching = new CapsSearching();
        capsSearching.setSearch(new CapsSearch("yes", "q,cat,limit,offset,minage,maxage,minsize,maxsize"));
        capsSearching.setTvSearch(new CapsSearch("yes", "q,rid,tvdbid,tvmazeid,traktid,season,ep,cat,limit,offset,minage,maxage,minsize,maxsize"));
        capsSearching.setMovieSearch(new CapsSearch("yes", "q,imdbid,tmdbid,cat,limit,offset,minage,maxage,minsize,maxsize"));
        capsSearching.setBookSearch(new CapsSearch("yes", "q,author,title,cat,limit,offset,minage,maxage,minsize,maxsize"));
        capsSearching.setAudioSearch(new CapsSearch("no", ""));
        capsRoot.setSearching(capsSearching);

        capsRoot.setCategories(null);
        //TODO categories, actually needed for anything?

        return new ResponseEntity<>(capsRoot, HttpStatus.OK);
    }

    protected ResponseEntity<?> getNzb(NewznabParameters params) throws MissingParameterException, UnknownErrorException {
        if (Strings.isNullOrEmpty(params.getId())) {
            throw new MissingParameterException("Missing ID/GUID");
        }

        NzbDownloadResult downloadResult = nzbHandler.getNzbByGuid(Long.valueOf(params.getId()), configProvider.getBaseConfig().getSearching().getNzbAccessType(), SearchSource.API, UsernameOrIpStorage.ipForExternal.get());
        if (!downloadResult.isSuccessful()) {
            throw new UnknownErrorException(downloadResult.getError());
        }

        return downloadResult.getAsResponseEntity();
    }

    protected RssRoot search(NewznabParameters params, HttpServletRequest request) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        SearchRequest searchRequest = buildBaseSearchRequest(params);
        if (isTorznabCall(request)) {
            searchRequest.setDownloadType(org.nzbhydra.searching.DownloadType.TORRENT);
        } else {
            searchRequest.setDownloadType(org.nzbhydra.searching.DownloadType.NZB);
        }
        searchRequest.getInternalData().setUserAgent(getUserAgent(request));
        SearchResult searchResult = searcher.search(searchRequest);

        RssRoot transformedResults = transformResults(searchResult, params, searchRequest);
        logger.info("Search took {}ms. Returning {} results", stopwatch.elapsed(TimeUnit.MILLISECONDS), transformedResults.getRssChannel().getItems().size());
        return transformedResults;
    }

    private String getUserAgent(HttpServletRequest request) {
        String header = request.getHeader("User-Agent");
        if (header == null) {
            logger.debug("No user agent provided");
            return null;
        }
        for (String toCompare : USER_AGENTS) {
            String headerLowercase = header.toLowerCase();
            if (headerLowercase.contains(toCompare.toLowerCase())) {
                logger.debug("User agent {} mapped to {}", header, toCompare);
                return toCompare;
            }
        }
        logger.debug("Unknown user agent {}", header);
        return "Other";
    }

    private boolean isTorznabCall(HttpServletRequest request) {
        return request.getRequestURL().toString().toLowerCase().contains("torznab");
    }

    @ExceptionHandler(value = ExternalApiException.class)
    public Xml handler(ExternalApiException e) {
        RssError error = new RssError(e.getStatusCode(), e.getMessage());
        return error;
    }

    @ExceptionHandler(value = Exception.class)
    public ResponseEntity handleUnexpectedError(Exception e) {
        logger.error("Unexpected error while handling API request", e);
        if (configProvider.getBaseConfig().getSearching().isWrapApiErrors()) {
            logger.debug("Wrapping error in empty search result");
            return ResponseEntity.status(200).body(getRssRoot(Collections.emptyList(), 0, 0, null));
        } else {
            RssError error = new RssError("900", e.getMessage());
            return ResponseEntity.status(200).body(error);
        }
    }


    protected RssRoot transformResults(SearchResult searchResult, NewznabParameters params, SearchRequest searchRequest) {
        Stopwatch stopwatch = Stopwatch.createStarted();

        int total = searchResult.getNumberOfTotalAvailableResults() - searchResult.getNumberOfRejectedResults() - searchResult.getNumberOfRemovedDuplicates();
        RssRoot rssRoot = getRssRoot(searchResult.getSearchResultItems(), params.getOffset(), total, searchRequest);
        logger.debug(LoggingMarkers.PERFORMANCE, "Transforming results took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return rssRoot;
    }

    private RssRoot getRssRoot(List<SearchResultItem> searchResultItems, Integer offset, int total, SearchRequest searchRequest) {
        RssRoot rssRoot = new RssRoot();

        RssChannel rssChannel = new RssChannel();
        rssChannel.setTitle("NZBHydra 2");
        rssChannel.setLink("https://www.github.com/theotherp/nzbhydra2");
        rssChannel.setWebMaster("theotherp@gmx.de");
        rssChannel.setNewznabResponse(new NewznabResponse(offset, total));
        rssChannel.setGenerator("NZBHydra2");

        rssRoot.setRssChannel(rssChannel);
        List<RssItem> items = new ArrayList<>();
        for (SearchResultItem searchResultItem : searchResultItems) {
            RssItem rssItem = buildRssItem(searchResultItem, searchRequest);
            items.add(rssItem);
        }

        rssChannel.setItems(items);
        return rssRoot;
    }

    protected RssItem buildRssItem(SearchResultItem searchResultItem, SearchRequest searchRequest) {
        RssItem rssItem = new RssItem();
        String link = nzbHandler.getNzbDownloadLink(searchResultItem.getSearchResultId(), false, DownloadType.NZB);
        rssItem.setLink(link);
        rssItem.setTitle(searchResultItem.getTitle());
        rssItem.setRssGuid(new RssGuid(String.valueOf(searchResultItem.getGuid()), false));
        rssItem.setPubDate(searchResultItem.getPubDate());
        List<NewznabAttribute> newznabAttributes = searchResultItem.getAttributes().entrySet().stream().map(attribute -> new NewznabAttribute(attribute.getKey(), attribute.getValue())).sorted(Comparator.comparing(NewznabAttribute::getName)).collect(Collectors.toList());
        if (searchRequest.getDownloadType() == org.nzbhydra.searching.DownloadType.NZB) {
            rssItem.setNewznabAttributes(newznabAttributes);
        } else {
            rssItem.setTorznabAttributes(newznabAttributes);
        }
        rssItem.setEnclosure(new Enclosure(link, searchResultItem.getSize()));
        rssItem.setComments(searchResultItem.getCommentsLink());
        rssItem.setDescription(searchResultItem.getDescription());
        rssItem.setDescription(configProvider.getBaseConfig().getSearching().isUseOriginalCategories() ? searchResultItem.getOriginalCategory() : searchResultItem.getCategory().getName());
        return rssItem;
    }


    private SearchRequest buildBaseSearchRequest(NewznabParameters params) {
        SearchType searchType = SearchType.valueOf(params.getT().name());
        SearchRequest searchRequest = searchRequestFactory.getSearchRequest(searchType, SearchSource.API, categoryProvider.fromNewznabCategories(params.getCat(), CategoriesConfig.allCategory), random.nextInt(1000000), params.getOffset(), params.getLimit());
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
        searchRequest.getInternalData().setUsernameOrIp(UsernameOrIpStorage.ipForExternal.get());
        if (params.getCat() != null) {
            searchRequest.getInternalData().setNewznabCategories(params.getCat());
        }

        if (!Strings.isNullOrEmpty(params.getTvdbid())) {
            searchRequest.getIdentifiers().put(IdType.TVDB, params.getTvdbid());
        }
        if (!Strings.isNullOrEmpty(params.getTvmazeid())) {
            searchRequest.getIdentifiers().put(IdType.TVMAZE, params.getTvmazeid());
        }
        if (!Strings.isNullOrEmpty(params.getRid())) {
            searchRequest.getIdentifiers().put(IdType.TVRAGE, params.getRid());
        }
        if (!Strings.isNullOrEmpty(params.getImdbid())) {
            searchRequest.getIdentifiers().put(IdType.IMDB, params.getImdbid());
        }
        if (!Strings.isNullOrEmpty(params.getTmdbid())) {
            searchRequest.getIdentifiers().put(IdType.TMDB, params.getTmdbid());
        }

        return searchRequest;
    }

    @Data
    @AllArgsConstructor
    private static class CacheEntryValue {
        private final NewznabParameters params;
        private final Instant lastUpdate;
        private final RssRoot searchResult;

        @Override
        public boolean equals(Object o) {
            if (this == o) {
                return true;
            }
            if (o == null || getClass() != o.getClass()) {
                return false;
            }
            if (!super.equals(o)) {
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
