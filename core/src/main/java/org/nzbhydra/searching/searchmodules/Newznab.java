package org.nzbhydra.searching.searchmodules;

import com.google.common.base.Stopwatch;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.nzbhydra.database.IndexerEntity;
import org.nzbhydra.database.IndexerRepository;
import org.nzbhydra.database.SearchResultEntity;
import org.nzbhydra.database.SearchResultRepository;
import org.nzbhydra.mapping.NewznabAttribute;
import org.nzbhydra.mapping.NewznabResponse;
import org.nzbhydra.mapping.RssItem;
import org.nzbhydra.mapping.RssRoot;
import org.nzbhydra.searching.IndexerConfig;
import org.nzbhydra.searching.IndexerSearchResult;
import org.nzbhydra.searching.SearchModuleConfigProvider;
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
public class Newznab extends AbstractSearchModule {

    private static final Logger logger = LoggerFactory.getLogger(Newznab.class);

    private String apikey;
    private IndexerEntity indexer;

    @Autowired
    private SearchResultRepository searchResultRepository;

    @Autowired
    private IndexerRepository indexerRepository;

    @Autowired
    private SearchModuleConfigProvider searchModuleConfigProvider;

    @Autowired
    protected RestTemplate restTemplate;

    private Random random = new Random();


    protected UriComponentsBuilder getBaseUri() {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(config.getHost());
        return builder.path("/api").queryParam("apikey", config.getApikey());
    }

    @Override
    public IndexerSearchResult search(SearchRequest searchRequest) {

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

        NewznabResponse newznabResponse = rssRoot.getRssChannel().getNewznabResponse();
        if (newznabResponse != null) {
            indexerSearchResult.setTotalResultsKnown(true);
            indexerSearchResult.setTotalResults(newznabResponse.getTotal());
            indexerSearchResult.setHasMoreResults(newznabResponse.getTotal() > newznabResponse.getOffset() + searchRequest.getOffset());
        } else {
            indexerSearchResult.setTotalResultsKnown(false);
            indexerSearchResult.setHasMoreResults(false);
        }

        logger.info("Processed search results in {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));

        return indexerSearchResult;
    }

    private List<SearchResultItem> getSearchResultItems(RssRoot rssRoot) {
        List<SearchResultItem> searchResultItems = new ArrayList<>();
        List<SearchResultEntity> searchResultEntitiesToSave = new ArrayList<>();

        for (RssItem item : rssRoot.getRssChannel().getItems()) {
            String guid = item.getRssGuid().getGuid();

            SearchResultItem searchResultItem;
            SearchResultEntity searchResultEntity = searchResultRepository.findByIndexerEntityAndIndexerGuid(indexer, guid);
            if (searchResultEntity == null) {
                searchResultEntity = new SearchResultEntity();

                //Set all entity relevant data
                searchResultEntity.setLink(item.getLink());
                searchResultEntity.setDetails("somedetails");
                searchResultEntity.setIndexerGuid(guid);
                searchResultEntity.setFirstFound(Instant.now());
                searchResultEntity.setIndexerEntity(indexer);
                searchResultEntity.setTitle(item.getTitle());
                searchResultEntitiesToSave.add(searchResultEntity);

            }
            searchResultItem = new SearchResultItem(searchResultEntity);

            //Set all data not saved in the db
            searchResultItem.setSize(random.nextLong());
            searchResultItem.setPubDate(item.getPubDate());
            searchResultItem.setIndexerScore(config.getScore());
            searchResultItem.setGuid("todoHash");
            for (NewznabAttribute attribute : item.getAttributes()) {
                searchResultItem.getAttributes().put(attribute.getName(), attribute.getValue());
            }
            searchResultItems.add(searchResultItem);
        }
        //Save entities in bulk
        searchResultRepository.save(searchResultEntitiesToSave);
        return searchResultItems;
    }

    @Override
    public void initialize(IndexerConfig config) {
        this.config = config;

        indexer = indexerRepository.findByName(config.getName());
        if (indexer == null) {
            indexer = new IndexerEntity();
            indexer.setName(config.getName());
            indexer = indexerRepository.save(indexer);
        }
    }

}
