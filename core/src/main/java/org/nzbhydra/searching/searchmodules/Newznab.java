package org.nzbhydra.searching.searchmodules;

import com.google.common.base.Stopwatch;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.nzbhydra.mapping.NewznabAttribute;
import org.nzbhydra.mapping.NewznabResponse;
import org.nzbhydra.mapping.RssItem;
import org.nzbhydra.mapping.RssRoot;
import org.nzbhydra.searching.IndexerSearchResult;
import org.nzbhydra.searching.SearchResultItem;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.concurrent.TimeUnit;

@Data
@Component
@EqualsAndHashCode(callSuper = false)
public class Newznab extends AbstractIndexer {

    private static final Logger logger = LoggerFactory.getLogger(AbstractIndexer.class);

    @Autowired
    protected RestTemplate restTemplate;

    private final Random random = new Random();


    protected UriComponentsBuilder getBaseUri() {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(config.getHost());
        return builder.path("/api").queryParam("apikey", config.getApikey());
    }

    @Override
    public IndexerSearchResult search(SearchRequest searchRequest, int offset, int limit) {

        IndexerSearchResult indexerSearchResult;
        try {
            indexerSearchResult = searchInternal(searchRequest);
            //TODO handle indexer success
            indexerSearchResult.setWasSuccessful(true);
        } catch (Exception e) {
            //TODO handle indexer failure
            logger.error("Error while searching", e);
            return new IndexerSearchResult(false);
        }
        return indexerSearchResult;
    }

    protected UriComponentsBuilder buildSearchUrl(SearchRequest searchRequest) {
        UriComponentsBuilder componentsBuilder = getBaseUri().queryParam("t", searchRequest.getSearchType().name().toLowerCase());

        if (searchRequest.getQuery() != null) {
            componentsBuilder.queryParam("q", searchRequest.getQuery());
        } else if (searchRequest.getIdentifierKey() != null) {
            //TODO ID conversion
            componentsBuilder.queryParam(searchRequest.getIdentifierKey(), searchRequest.getIdentifierValue());
            if (searchRequest.getSeason() != null) {
                componentsBuilder.queryParam("season", searchRequest.getSeason());
            }
            if (searchRequest.getEpisode() != null) {
                componentsBuilder.queryParam("ep", searchRequest.getEpisode());
            }
        }
        
        if (searchRequest.getMinage() != null) {
            componentsBuilder.queryParam("minage", searchRequest.getMinage());
        }
        if (searchRequest.getMaxage() != null) {
            componentsBuilder.queryParam("maxage", searchRequest.getMaxage());
        }
        if (searchRequest.getMinsize() != null) {
            componentsBuilder.queryParam("minsize", searchRequest.getMinsize());
        }
        if (searchRequest.getMaxsize() != null) {
            componentsBuilder.queryParam("maxsize", searchRequest.getMaxsize());
        }
        if (searchRequest.getTitle() != null) {
            componentsBuilder.queryParam("title", searchRequest.getTitle());
        }
        if (searchRequest.getMaxsize() != null) {
            componentsBuilder.queryParam("author", searchRequest.getAuthor());
        }


        return componentsBuilder;
    }

    protected IndexerSearchResult searchInternal(SearchRequest searchRequest) {
        String url = buildSearchUrl(searchRequest).build().toString();

        RssRoot rssRoot;
        Stopwatch stopwatch = Stopwatch.createStarted();
        try {
            rssRoot = restTemplate.getForObject(url, RssRoot.class);
            logger.info("Successfully loaded results in {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
        } catch (HttpClientErrorException e) {
            logger.error("Unable to call URL " + url);
            return null; //TODO handle error
        }

        stopwatch.reset();
        stopwatch.start();
        IndexerSearchResult indexerSearchResult = new IndexerSearchResult();
        indexerSearchResult.setSearchResultItems(getSearchResultItems(rssRoot));
        indexerSearchResult.setWasSuccessful(true);
        indexerSearchResult.setIndexer(this);

        NewznabResponse newznabResponse = rssRoot.getRssChannel().getNewznabResponse();
        if (newznabResponse != null) {
            indexerSearchResult.setTotalResultsKnown(true);
            indexerSearchResult.setTotalResults(newznabResponse.getTotal());
            indexerSearchResult.setHasMoreResults(newznabResponse.getTotal() > newznabResponse.getOffset() + indexerSearchResult.getSearchResultItems().size()); //TODO Not all indexers report an offset
            indexerSearchResult.setOffset(newznabResponse.getOffset());
            indexerSearchResult.setLimit(100); //TODO
        } else {
            //TODO see above
            indexerSearchResult.setTotalResultsKnown(false);
            indexerSearchResult.setHasMoreResults(false);
            indexerSearchResult.setOffset(0);
            indexerSearchResult.setLimit(0);
        }

        logger.info("Processed search results in {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));

        return indexerSearchResult;
    }

    private List<SearchResultItem> getSearchResultItems(RssRoot rssRoot) {
        List<SearchResultItem> searchResultItems = new ArrayList<>();

        for (RssItem item : rssRoot.getRssChannel().getItems()) {
            SearchResultItem searchResultItem = new SearchResultItem();

            searchResultItem.setLink(item.getLink());
            searchResultItem.setDetails("somedetails");
            searchResultItem.setIndexerGuid(item.getRssGuid().getGuid());
            searchResultItem.setFirstFound(Instant.now());
            searchResultItem.setIndexer(indexer);
            searchResultItem.setTitle(item.getTitle());
            searchResultItem.setSize(searchResultItem.getSize());
            searchResultItem.setPubDate(item.getPubDate());
            searchResultItem.setIndexerScore(config.getScore());
            searchResultItem.setGuid(hashItem(searchResultItem));
            for (NewznabAttribute attribute : item.getAttributes()) {
                searchResultItem.getAttributes().put(attribute.getName(), attribute.getValue());
            }
            searchResultItems.add(searchResultItem);

        }
        persistSearchResults(searchResultItems);

        return searchResultItems;
    }


}
