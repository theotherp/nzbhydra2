package org.nzbhydra.api;

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
import java.util.stream.Collectors;
import java.util.stream.Stream;

@RestController
public class ExternalApi {

    private static final Logger logger = LoggerFactory.getLogger(CoreApplication.class);

    @Autowired
    private Searcher searcher;

    @Autowired
    CategoryProvider categoryProvider;


    @RequestMapping(value = "/api", produces = MediaType.TEXT_XML_VALUE)
    public RssRoot api(ApiCallParameters params) {

        if (Stream.of(ActionAttribute.SEARCH, ActionAttribute.BOOK, ActionAttribute.TVSEARCH, ActionAttribute.MOVIE).anyMatch(x -> x == params.getT())) {
            SearchResult searchResult = search(params);
            RssRoot rssRoot = transformResultsToRss(searchResult);

            return rssRoot;
        }
        return new RssRoot();
    }

    private RssRoot transformResultsToRss(SearchResult searchResult) {
        RssRoot rssRoot = new RssRoot();

        RssChannel rssChannel = new RssChannel();
        rssChannel.setTitle("NZB Hydra 2");
        rssChannel.setLink("link");
        rssChannel.setWebMaster("todo");
        rssChannel.setNewznabResponse(new NewznabResponse(1, 100)); //TODO


        rssRoot.setRssChannel(rssChannel);
        List<RssItem> items = new ArrayList<>();
        for (SearchResultItem searchResultItem : searchResult.getSearchResultItems()) {
            RssItem item = new RssItem();
            item.setLink(searchResultItem.getLink());
            item.setTitle(searchResultItem.getTitle());
            item.setRssGuid(new RssGuid(searchResultItem.getGuid(), false));
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
        SearchRequest searchRequest = buildBaseSearchRequest(params).searchType(searchType).query(params.getQ()).build();
        SearchResult searchResult = searcher.search(searchRequest);

        return searchResult;
    }

    private SearchRequest.SearchRequestBuilder buildBaseSearchRequest(ApiCallParameters params) {
        SearchRequest.SearchRequestBuilder builder = SearchRequest.builder();
        //TODO categories
        //TODO ID searches
        //@formatter:off
        return builder
                .query(params.getQ())
                .limit(params.getLimit())
                .offset(params.getOffset())
                .maxage(params.getMaxage())
                .author(params.getAuthor())
                .title(params.getTitle())
                .season(params.getSeason())
                .episode(params.getEp())
                .category(categoryProvider.fromNewznabCategories(params.getCat()))
                ;
        //@formatter:on
    }

}
