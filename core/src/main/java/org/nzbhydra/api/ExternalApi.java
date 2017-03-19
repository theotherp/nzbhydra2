package org.nzbhydra.api;

import com.google.common.base.Stopwatch;
import org.nzbhydra.CoreApplication;
import org.nzbhydra.mapping.*;
import org.nzbhydra.searching.*;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.TreeSet;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@RestController
public class ExternalApi {

    private static final Logger logger = LoggerFactory.getLogger(CoreApplication.class);

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

        List<TreeSet<SearchResultItem>> duplicateGroups = searchResult.getDuplicateDetectionResult().getDuplicateGroups();

        //TODO Pick results from duplicate groups by indexer score etc
        //Assuming for now results were already sorted by score, then age
        List<SearchResultItem> searchResultItems = duplicateGroups.stream().map(x -> x.iterator().next()).sorted().collect(Collectors.toList());

        //Account for offset and limit
        int maxIndex = searchResultItems.size();
        logger.info("Returning items {} to {} of {} items", params.getOffset(), params.getOffset() + params.getLimit(), searchResultItems.size());
        searchResultItems = searchResultItems.subList(Math.min(params.getOffset(), maxIndex), Math.min(params.getOffset() + params.getLimit(), maxIndex));


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
            List<NewznabAttribute> newznabAttributes = searchResultItem.getAttributes().entrySet().stream().map(attribute -> new NewznabAttribute(attribute.getKey(), attribute.getValue())).collect(Collectors.toList());
            item.setAttributes(newznabAttributes);
            items.add(item);
        }

        rssChannel.setItems(items);

        return rssRoot;
    }

    private SearchResult search(ApiCallParameters params) {
        SearchType searchType = SearchType.valueOf(params.getT().name());

        SearchRequest searchRequest = buildBaseSearchRequest(params);
        searchRequest.setSearchType(searchType);


        return searcher.search(searchRequest);
    }

    private SearchRequest buildBaseSearchRequest(ApiCallParameters params) {

        //TODO categories
        //TODO ID searches

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
        return searchRequest;
    }

}
