package org.nzbhydra.api;

import com.google.common.base.Stopwatch;
import com.google.common.base.Strings;
import org.nzbhydra.rssmapping.*;
import org.nzbhydra.searching.*;
import org.nzbhydra.searching.infos.InfoProvider.IdType;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
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
    private CategoryProvider categoryProvider;


    @RequestMapping(value = "/api", produces = MediaType.TEXT_XML_VALUE)
    public RssRoot api(ApiCallParameters params) {
        logger.info("Received external API call: " + params);
        Stopwatch stopwatch = Stopwatch.createStarted();
        if (Stream.of(ActionAttribute.SEARCH, ActionAttribute.BOOK, ActionAttribute.TVSEARCH, ActionAttribute.MOVIE).anyMatch(x -> x == params.getT())) {
            SearchResult searchResult = search(params);

            RssRoot transformedResults = transformResults(searchResult, params);
            logger.debug("Search took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
            return transformedResults;
        }

        //TODO handle missing or wrong parameters

        return new RssRoot();
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
        rssChannel.setWebMaster("todo");
        rssChannel.setNewznabResponse(new NewznabResponse( params.getOffset(), searchResultItems.size())); //TODO


        rssRoot.setRssChannel(rssChannel);
        List<RssItem> items = new ArrayList<>();
        for (SearchResultItem searchResultItem : searchResultItems) {
            RssItem item = new RssItem();
            item.setLink(searchResultItem.getLink());
            item.setTitle(searchResultItem.getTitle());
            item.setRssGuid(new RssGuid(String.valueOf(searchResultItem.getGuid()), false));
            item.setPubDate(searchResultItem.getPubDate());
            List<NewznabAttribute> newznabAttributes = searchResultItem.getAttributes().entrySet().stream().map(attribute -> new NewznabAttribute(attribute.getKey(), attribute.getValue())).sorted(Comparator.comparing(NewznabAttribute::getName)).collect(Collectors.toList());
            item.setAttributes(newznabAttributes);
            items.add(item);
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
        SearchType searchType = SearchType.valueOf(params.getT().name());

        SearchRequest searchRequest = buildBaseSearchRequest(params);
        searchRequest.setSearchType(searchType);

        return searcher.search(searchRequest);
    }

    private SearchRequest buildBaseSearchRequest(ApiCallParameters params) {
        SearchRequest searchRequest = new SearchRequest();
        searchRequest.setQuery(params.getQ());
        searchRequest.setLimit(params.getLimit());
        searchRequest.setOffset(params.getOffset());
        searchRequest.setMaxage(params.getMaxage());
        searchRequest.setAuthor(params.getAuthor());
        searchRequest.setTitle(params.getTitle());
        searchRequest.setSeason(params.getSeason());
        searchRequest.setEpisode(params.getEp());
        searchRequest.setCategory(categoryProvider.fromNewznabCategories(params.getCat()));

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
