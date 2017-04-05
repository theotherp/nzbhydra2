package org.nzbhydra.api;

import com.google.common.base.Stopwatch;
import com.google.common.base.Strings;
import org.nzbhydra.NzbDownloadResult;
import org.nzbhydra.NzbHandler;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.mediainfo.InfoProvider.IdType;
import org.nzbhydra.rssmapping.Enclosure;
import org.nzbhydra.rssmapping.NewznabAttribute;
import org.nzbhydra.rssmapping.NewznabResponse;
import org.nzbhydra.rssmapping.RssChannel;
import org.nzbhydra.rssmapping.RssError;
import org.nzbhydra.rssmapping.RssGuid;
import org.nzbhydra.rssmapping.RssItem;
import org.nzbhydra.rssmapping.RssRoot;
import org.nzbhydra.rssmapping.Xml;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.SearchResult;
import org.nzbhydra.searching.SearchResultItem;
import org.nzbhydra.searching.SearchType;
import org.nzbhydra.searching.Searcher;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchRequest.AccessSource;
import org.nzbhydra.searching.searchrequests.SearchRequestFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
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
    private SearchRequestFactory searchRequestFactory;
    @Autowired
    private NzbHandler nzbDownloader;
    @Autowired
    private BaseConfig baseConfig;

    @Autowired
    private CategoryProvider categoryProvider;

    @RequestMapping(value = "/api", produces = MediaType.TEXT_XML_VALUE)
    public ResponseEntity<? extends Object> api(ApiCallParameters params) throws Exception {
        logger.info("Received external API call: " + params);

        if (!Objects.equals(params.getApikey(), baseConfig.getMain().getApiKey())) {
            logger.error("Received API call with wrong API key");
            throw new WrongApiKeyException("Wrong api key");
        }

        Stopwatch stopwatch = Stopwatch.createStarted();
        if (Stream.of(ActionAttribute.SEARCH, ActionAttribute.BOOK, ActionAttribute.TVSEARCH, ActionAttribute.MOVIE).anyMatch(x -> x == params.getT())) {
            SearchResult searchResult = search(params);

            RssRoot transformedResults = transformResults(searchResult, params);
            logger.debug("Search took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
            return new ResponseEntity<>(transformedResults, HttpStatus.OK);
        }

        if (params.getT() == ActionAttribute.GET) {
            if (Strings.isNullOrEmpty(params.getId())) {
                throw new MissingParameterException("Missing ID/GUID");
            }
            NzbDownloadResult downloadResult = nzbDownloader.getNzbByGuid(Long.valueOf(params.getId()), baseConfig.getSearching().getNzbAccessType());
            if (!downloadResult.isSuccessful()) {
                throw new UnknownErrorException(downloadResult.getError());
            }

            return downloadResult.getAsResponseEntity();
        }

        //TODO handle missing or wrong parameters

        return new ResponseEntity<Object>(new RssRoot(), HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(value = ExternalApiException.class)
    public Xml handler(ExternalApiException e) {
        RssError error = new RssError(e.getStatusCode(), e.getMessage());
        return error;
    }

    protected RssRoot transformResults(SearchResult searchResult, ApiCallParameters params) {
        logger.debug("Transforming searchResults");
        List<SearchResultItem> searchResultItems = pickSearchResultItemsFromDuplicateGroups(searchResult);

        //Account for offset and limit
        int maxIndex = searchResultItems.size();
        int fromIndex = Math.min(params.getOffset(), maxIndex);
        int toIndex = Math.min(params.getOffset() + params.getLimit(), maxIndex);
        logger.info("Returning items {} to {} of {} items", fromIndex, toIndex, searchResultItems.size());
        searchResultItems = searchResultItems.subList(fromIndex, toIndex);


        RssRoot rssRoot = new RssRoot();

        RssChannel rssChannel = new RssChannel();
        rssChannel.setTitle("NZB Hydra 2");
        rssChannel.setLink("link");
        rssChannel.setWebMaster("theotherp@gmx.de");
        rssChannel.setNewznabResponse(new NewznabResponse( params.getOffset(), searchResultItems.size())); //TODO
        rssChannel.setGenerator("NZBHydra");


        rssRoot.setRssChannel(rssChannel);
        List<RssItem> items = new ArrayList<>();
        for (SearchResultItem searchResultItem : searchResultItems) {
            RssItem rssItem = new RssItem();
            String link = searchResultItem.getLink(); //TODO Construct
            rssItem.setLink(link);
            rssItem.setTitle(searchResultItem.getTitle());
            rssItem.setRssGuid(new RssGuid(String.valueOf(searchResultItem.getGuid()), false));
            rssItem.setPubDate(searchResultItem.getPubDate());
            List<NewznabAttribute> newznabAttributes = searchResultItem.getAttributes().entrySet().stream().map(attribute -> new NewznabAttribute(attribute.getKey(), attribute.getValue())).sorted(Comparator.comparing(NewznabAttribute::getName)).collect(Collectors.toList());
            rssItem.setAttributes(newznabAttributes);
            rssItem.setEnclosure(new Enclosure(link, searchResultItem.getSize()));
            rssItem.setComments(searchResultItem.getCommentsLink());
            rssItem.setDescription(searchResultItem.getDescription());
            rssItem.setDescription(searchResultItem.getCategory().getName());

            items.add(rssItem);
        }

        rssChannel.setItems(items);
        logger.debug("Finished transforming");
        return rssRoot;
    }

    protected List<SearchResultItem> pickSearchResultItemsFromDuplicateGroups(SearchResult searchResult) {
        List<TreeSet<SearchResultItem>> duplicateGroups = searchResult.getDuplicateDetectionResult().getDuplicateGroups();

        return duplicateGroups.stream().map(x -> {
            return x.stream().sorted(Comparator.comparingInt(SearchResultItem::getIndexerScore).reversed().thenComparing(Comparator.comparingLong((SearchResultItem y) -> y.getPubDate().getEpochSecond()).reversed())).iterator().next();
        }).sorted(Comparator.comparingLong((SearchResultItem x) -> x.getPubDate().getEpochSecond()).reversed()).collect(Collectors.toList());
    }

    private SearchResult search(ApiCallParameters params) {
        SearchRequest searchRequest = buildBaseSearchRequest(params);
        return searcher.search(searchRequest);
    }

    private SearchRequest buildBaseSearchRequest(ApiCallParameters params) {
        SearchType searchType = SearchType.valueOf(params.getT().name());
        SearchRequest searchRequest = searchRequestFactory.getSearchRequest(searchType, AccessSource.API, categoryProvider.fromNewznabCategories(params.getCat()), params.getOffset(), params.getLimit());
        searchRequest.setQuery(params.getQ());
        searchRequest.setLimit(params.getLimit());
        searchRequest.setOffset(params.getOffset());
        searchRequest.setMaxage(params.getMaxage());
        searchRequest.setAuthor(params.getAuthor());
        searchRequest.setTitle(params.getTitle());
        searchRequest.setSeason(params.getSeason());
        searchRequest.setEpisode(params.getEp());


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

}
