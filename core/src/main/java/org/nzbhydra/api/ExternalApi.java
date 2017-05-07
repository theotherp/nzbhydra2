package org.nzbhydra.api;

import com.google.common.base.Stopwatch;
import com.google.common.base.Strings;
import org.nzbhydra.NzbDownloadResult;
import org.nzbhydra.NzbHandler;
import org.nzbhydra.config.BaseConfig;
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
import org.nzbhydra.mediainfo.InfoProvider.IdType;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.OffsetAndLimitCalculation;
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
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.TreeSet;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@RestController
public class ExternalApi {

    private static final Logger logger = LoggerFactory.getLogger(ExternalApi.class);

    @Autowired
    protected Searcher searcher;
    @Autowired
    protected SearchRequestFactory searchRequestFactory;
    @Autowired
    protected NzbHandler nzbHandler;
    @Autowired
    protected BaseConfig baseConfig;

    @Autowired
    private CategoryProvider categoryProvider;

    @RequestMapping(value = "/api", produces = MediaType.APPLICATION_RSS_XML_VALUE)
    public ResponseEntity<? extends Object> api(NewznabParameters params, HttpServletRequest request) throws Exception {

        logger.info("Received external API call: " + params);

        //TODO Check if this is still needed, perhaps manually checking and returning proper error message page is better
        if (baseConfig.getMain().getApiKey().isPresent() && !Objects.equals(params.getApikey(), baseConfig.getMain().getApiKey().get())) {
            logger.error("Received API call with wrong API key");
            throw new WrongApiKeyException("Wrong api key");
        }

        Stopwatch stopwatch = Stopwatch.createStarted();
        if (Stream.of(ActionAttribute.SEARCH, ActionAttribute.BOOK, ActionAttribute.TVSEARCH, ActionAttribute.MOVIE).anyMatch(x -> x == params.getT())) {
            SearchResult searchResult = search(params);

            RssRoot transformedResults = transformResults(searchResult, params);
            logger.info("Search took {}ms. Returning {} results", stopwatch.elapsed(TimeUnit.MILLISECONDS), transformedResults.getRssChannel().getItems().size());
            return new ResponseEntity<>(transformedResults, HttpStatus.OK);
        }

        if (params.getT() == ActionAttribute.GET) {
            if (Strings.isNullOrEmpty(params.getId())) {
                throw new MissingParameterException("Missing ID/GUID");
            }

            NzbDownloadResult downloadResult = nzbHandler.getNzbByGuid(Long.valueOf(params.getId()), baseConfig.getSearching().getNzbAccessType(), SearchSource.API, UsernameOrIpStorage.ipForExternal.get());
            if (!downloadResult.isSuccessful()) {
                throw new UnknownErrorException(downloadResult.getError());
            }

            return downloadResult.getAsResponseEntity();
        }

        RssError error = new RssError("200", "Unknown or incorrect parameter"); //TODO log or throw as exeption so it's logged
        return new ResponseEntity<Object>(error, HttpStatus.OK);
    }

    @ExceptionHandler(value = ExternalApiException.class)
    public Xml handler(ExternalApiException e) {
        RssError error = new RssError(e.getStatusCode(), e.getMessage());
        return error;
    }

    @ExceptionHandler(value = Exception.class)
    public ResponseEntity handleUnexpectedError(Exception e) {
        logger.error("Unexpected error while handling API request", e);
        if (baseConfig.getSearching().isWrapApiErrors()) {
            logger.debug("Wrapping error in empty search result");
            return ResponseEntity.status(200).body(getRssRoot(Collections.emptyList(), 0, 0));
        } else {
            RssError error = new RssError("900", e.getMessage());
            return ResponseEntity.status(200).body(error);
        }
    }


    protected RssRoot transformResults(SearchResult searchResult, NewznabParameters params) {
        logger.debug("Transforming searchResults");
        List<SearchResultItem> searchResultItems = pickSearchResultItemsFromDuplicateGroups(searchResult);

        OffsetAndLimitCalculation splice = searcher.calculateOffsetAndLimit(params.getOffset(), params.getLimit(), searchResultItems.size());

        searchResultItems = searchResultItems.subList(splice.getOffset(), splice.getOffset() + splice.getLimit());

        RssRoot rssRoot = getRssRoot(searchResultItems, splice.getOffset(), searchResult.calculateNumberOfTotalAvailableResults());
        logger.debug("Finished transforming");
        return rssRoot;
    }

    private RssRoot getRssRoot(List<SearchResultItem> searchResultItems, Integer offset, int total) {
        RssRoot rssRoot = new RssRoot();

        RssChannel rssChannel = new RssChannel();
        rssChannel.setTitle("NZB Hydra 2");
        rssChannel.setLink("https://www.github.com/theotherp/nzbhydra2");
        rssChannel.setWebMaster("theotherp@gmx.de");
        rssChannel.setNewznabResponse(new NewznabResponse(offset, total)); //TODO
        rssChannel.setGenerator("NZBHydra2");

        rssRoot.setRssChannel(rssChannel);
        List<RssItem> items = new ArrayList<>();
        for (SearchResultItem searchResultItem : searchResultItems) {
            RssItem rssItem = buildRssItem(searchResultItem);
            items.add(rssItem);
        }

        rssChannel.setItems(items);
        return rssRoot;
    }

    protected RssItem buildRssItem(SearchResultItem searchResultItem) {
        RssItem rssItem = new RssItem();
        String link = nzbHandler.getNzbDownloadLink(searchResultItem.getSearchResultId(), false, DownloadType.NZB);
        rssItem.setLink(link);
        rssItem.setTitle(searchResultItem.getTitle());
        rssItem.setRssGuid(new RssGuid(String.valueOf(searchResultItem.getGuid()), false));
        rssItem.setPubDate(searchResultItem.getPubDate());
        List<NewznabAttribute> newznabAttributes = searchResultItem.getAttributes().entrySet().stream().map(attribute -> new NewznabAttribute(attribute.getKey(), attribute.getValue())).sorted(Comparator.comparing(NewznabAttribute::getName)).collect(Collectors.toList());
        rssItem.setNewznabAttributes(newznabAttributes);
        rssItem.setEnclosure(new Enclosure(link, searchResultItem.getSize()));
        rssItem.setComments(searchResultItem.getCommentsLink());
        rssItem.setDescription(searchResultItem.getDescription());
        rssItem.setDescription(searchResultItem.getCategory().getName());
        return rssItem;
    }


    protected List<SearchResultItem> pickSearchResultItemsFromDuplicateGroups(SearchResult searchResult) {
        List<TreeSet<SearchResultItem>> duplicateGroups = searchResult.getDuplicateDetectionResult().getDuplicateGroups();

        return duplicateGroups.stream().map(x -> {
            return x.stream().sorted(Comparator.comparingInt(SearchResultItem::getIndexerScore).reversed().thenComparing(Comparator.comparingLong((SearchResultItem y) -> y.getPubDate().getEpochSecond()).reversed())).iterator().next();
        }).sorted(Comparator.comparingLong((SearchResultItem x) -> x.getPubDate().getEpochSecond()).reversed()).collect(Collectors.toList());
    }

    private SearchResult search(NewznabParameters params) {
        SearchRequest searchRequest = buildBaseSearchRequest(params);
        return searcher.search(searchRequest);
    }

    private SearchRequest buildBaseSearchRequest(NewznabParameters params) {
        SearchType searchType = SearchType.valueOf(params.getT().name());
        SearchRequest searchRequest = searchRequestFactory.getSearchRequest(searchType, SearchSource.API, categoryProvider.fromNewznabCategories(params.getCat()), params.getOffset(), params.getLimit());
        searchRequest.setQuery(params.getQ());
        searchRequest.setLimit(params.getLimit());
        searchRequest.setOffset(params.getOffset());
        searchRequest.setMaxage(params.getMaxage());
        searchRequest.setAuthor(params.getAuthor());
        searchRequest.setTitle(params.getTitle());
        searchRequest.setSeason(params.getSeason());
        searchRequest.setEpisode(params.getEp());
        searchRequest.getInternalData().setUsernameOrIp(UsernameOrIpStorage.ipForExternal.get());

        if (!Strings.isNullOrEmpty(params.getTvdbid())) {
            searchRequest.getIdentifiers().put(IdType.TVDB, params.getTvdbid());
        }
        if (!Strings.isNullOrEmpty(params.getTvmazeId())) {
            searchRequest.getIdentifiers().put(IdType.TVMAZE, params.getTvmazeId());
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

}
