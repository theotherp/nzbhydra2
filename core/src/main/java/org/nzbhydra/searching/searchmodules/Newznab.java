package org.nzbhydra.searching.searchmodules;

import com.google.common.base.Stopwatch;
import lombok.Getter;
import lombok.Setter;
import org.nzbhydra.database.IndexerApiAccessResult;
import org.nzbhydra.database.IndexerApiAccessType;
import org.nzbhydra.mapping.NewznabAttribute;
import org.nzbhydra.mapping.NewznabResponse;
import org.nzbhydra.mapping.RssItem;
import org.nzbhydra.mapping.RssRoot;
import org.nzbhydra.searching.IndexerSearchResult;
import org.nzbhydra.searching.SearchResultItem;
import org.nzbhydra.searching.infos.Info;
import org.nzbhydra.searching.infos.InfoProvider;
import org.nzbhydra.searching.infos.InfoProvider.IdType;
import org.nzbhydra.searching.infos.InfoProviderException;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.TimeUnit;

@Getter
@Setter
@Component
public class Newznab extends AbstractIndexer {

    private static final Logger logger = LoggerFactory.getLogger(Newznab.class);

    private static Map<IdType, String> idTypeToParamValueMap = new HashMap<>();

    static {
        idTypeToParamValueMap.put(IdType.IMDB, "imdbid");
        idTypeToParamValueMap.put(IdType.TMDB, "tmdbid");
        idTypeToParamValueMap.put(IdType.TVRAGE, "rid");
        idTypeToParamValueMap.put(IdType.TVDB, "tvdbid");
        idTypeToParamValueMap.put(IdType.TVMAZE, "tvmazeid");
    }

    @Autowired
    protected RestTemplate restTemplate;
    @Autowired
    private InfoProvider infoProvider;

    protected UriComponentsBuilder getBaseUri() {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(config.getHost());
        return builder.path("/api").queryParam("apikey", config.getApikey());
    }

    @Override
    public IndexerSearchResult search(SearchRequest searchRequest, int offset, int limit) {

        IndexerSearchResult indexerSearchResult;
        try {
            indexerSearchResult = searchInternal(searchRequest);
            indexerSearchResult.setWasSuccessful(true);
        } catch (Exception e) {
            logger.error("Error while searching", e);
            try {
                handleFailure(e.getMessage(), false, IndexerApiAccessType.SEARCH, null, IndexerApiAccessResult.CONNECTION_ERROR, null); //TODO depending on type of error, perhaps not at all because it might be a bug
            } catch (Exception e1) {
                logger.error("Error while handling indexer failure", e1);
            }
            //If not handle as failure still save the API access
            IndexerSearchResult searchResult = new IndexerSearchResult(this, false);
            searchResult.setErrorMessage(e.getMessage());
            return searchResult;
        }
        return indexerSearchResult;
    }

    protected UriComponentsBuilder buildSearchUrl(SearchRequest searchRequest) {
        UriComponentsBuilder componentsBuilder = getBaseUri().queryParam("t", searchRequest.getSearchType().name().toLowerCase());

        if (searchRequest.getQuery().isPresent()) {
            componentsBuilder.queryParam("q", searchRequest.getQuery().get());
        }

        //TODO query generation
        componentsBuilder = extendQueryWithSearchIds(searchRequest, componentsBuilder);

        if (searchRequest.getSeason().isPresent()) {
            componentsBuilder.queryParam("season", searchRequest.getSeason().get());
        }
        if (searchRequest.getEpisode().isPresent()) {
            componentsBuilder.queryParam("ep", searchRequest.getEpisode().get());
        }

        if (searchRequest.getMinage().isPresent()) {
            componentsBuilder.queryParam("minage", searchRequest.getMinage().get());
        }
        if (searchRequest.getMaxage().isPresent()) {
            componentsBuilder.queryParam("maxage", searchRequest.getMaxage().get());
        }

        if (searchRequest.getMinsize().isPresent()) {
            componentsBuilder.queryParam("minsize", searchRequest.getMinsize().get());
        }
        if (searchRequest.getMaxsize().isPresent()) {
            componentsBuilder.queryParam("maxsize", searchRequest.getMaxsize().get());
        }

        if (searchRequest.getTitle().isPresent()) {
            componentsBuilder.queryParam("title", searchRequest.getTitle().get());
        }
        if (searchRequest.getAuthor().isPresent()) {
            componentsBuilder.queryParam("author", searchRequest.getAuthor().get());
        }

        return componentsBuilder;
    }

    protected UriComponentsBuilder extendQueryWithSearchIds(SearchRequest searchRequest, UriComponentsBuilder componentsBuilder) {
        if (!searchRequest.getIdentifiers().isEmpty()) {
            Map<IdType, String> params = new HashMap<>();
            boolean indexerDoesNotSupportAnyOfProvidedIds = searchRequest.getIdentifiers().keySet().stream().noneMatch(x -> config.getSupportedSearchIds().contains(x.name()));
            if (indexerDoesNotSupportAnyOfProvidedIds) {
                boolean canConvertAnyId = searchRequest.getIdentifiers().keySet().stream().anyMatch(x -> config.getSupportedSearchIds().stream().anyMatch(y -> infoProvider.canConvert(x, IdType.valueOf(y.toUpperCase()))));
                if (canConvertAnyId) {
                    for (Map.Entry<IdType, String> providedId : searchRequest.getIdentifiers().entrySet()) {
                        if (!params.containsKey(providedId.getKey())) {
                            try {
                                Info info = infoProvider.convert(providedId.getValue(), providedId.getKey());
                                if (info.getImdbId().isPresent()) {
                                    params.put(IdType.IMDB, info.getImdbId().get());
                                }
                                if (info.getTmdbId().isPresent()) {
                                    params.put(IdType.TMDB, info.getTmdbId().get());
                                }
                                if (info.getTvRageId().isPresent()) {
                                    params.put(IdType.TVRAGE, info.getTvRageId().get());
                                }
                                if (info.getTvMazeId().isPresent()) {
                                    params.put(IdType.TVMAZE, info.getTvMazeId().get());
                                }
                                if (info.getTvDbId().isPresent()) {
                                    params.put(IdType.TVDB, info.getTvDbId().get());
                                }
                            } catch (InfoProviderException e) {
                                logger.error("Error while converting search ID", e);
                            }
                        }
                    }
                }
            }
            params.putAll(searchRequest.getIdentifiers());
            for (Map.Entry<IdType, String> entry : params.entrySet()) {
                componentsBuilder.queryParam(idTypeToParamValueMap.get(entry.getKey()), entry.getValue());
            }
        }
        return componentsBuilder;
    }

    protected IndexerSearchResult searchInternal(SearchRequest searchRequest) {
        String url = buildSearchUrl(searchRequest).build().toString();

        RssRoot rssRoot;
        Stopwatch stopwatch = Stopwatch.createStarted();
        Long responseTime;
        try {
            logger.info("Calling {}", url);
            rssRoot = restTemplate.getForObject(url, RssRoot.class);
            responseTime = stopwatch.elapsed(TimeUnit.MILLISECONDS);
            logger.info("Successfully loaded results in {}ms", responseTime);
            handleSuccess(IndexerApiAccessType.SEARCH, responseTime, IndexerApiAccessResult.SUCCESSFUL, url);
        } catch (HttpStatusCodeException | ResourceAccessException e) {
            //TODO try and find out what specifically went wrong, e.g. wrong api key, missing params, etc
            logger.error("Unable to call URL {}: {}", url, e.getMessage());
            handleFailure(e.getMessage(), false, IndexerApiAccessType.SEARCH, null, IndexerApiAccessResult.CONNECTION_ERROR, url); //TODO depending on type of error

            IndexerSearchResult errorResult = new IndexerSearchResult(this, false);
            errorResult.setErrorMessage(e.getMessage());
            errorResult.setSearchResultItems(Collections.emptyList());
            return errorResult;
        }

        stopwatch.reset();
        stopwatch.start();
        IndexerSearchResult indexerSearchResult = new IndexerSearchResult(this);
        indexerSearchResult.setSearchResultItems(getSearchResultItems(rssRoot));
        indexerSearchResult.setWasSuccessful(true);
        indexerSearchResult.setIndexer(this);
        indexerSearchResult.setResponseTime(responseTime);

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
        searchResultItems = persistSearchResults(searchResultItems);

        return searchResultItems;
    }

    protected Logger getLogger() {
        return logger;
    }


}
