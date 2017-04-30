package org.nzbhydra.web;

import com.google.common.base.Stopwatch;
import com.google.common.base.Strings;
import com.google.common.collect.Iterables;
import com.google.common.collect.Multiset;
import org.nzbhydra.NzbHandler;
import org.nzbhydra.config.Category;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.mediainfo.InfoProvider.IdType;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.IndexerSearchResult;
import org.nzbhydra.searching.SearchResultItem;
import org.nzbhydra.searching.SearchType;
import org.nzbhydra.searching.Searcher;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.nzbhydra.searching.searchrequests.SearchRequestFactory;
import org.nzbhydra.web.mapping.BasicSearchRequestParameters;
import org.nzbhydra.web.mapping.IndexerSearchMetaData;
import org.nzbhydra.web.mapping.MovieSearchRequestParameters;
import org.nzbhydra.web.mapping.SearchResponse;
import org.nzbhydra.web.mapping.SearchResult;
import org.nzbhydra.web.mapping.SearchResult.SearchResultBuilder;
import org.nzbhydra.web.mapping.TvSearchRequestParameters;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map.Entry;
import java.util.Random;
import java.util.TreeSet;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@RestController
public class Search {

    private static final Logger logger = LoggerFactory.getLogger(Search.class);

    @Autowired
    private Searcher searcher;
    @Autowired
    private CategoryProvider categoryProvider;
    @Autowired
    private SearchRequestFactory searchRequestFactory;
    @Autowired
    private NzbHandler nzbHandler;

    private Random random = new Random();

    @Secured({"ROLE_USER"})
    @RequestMapping(value = "/internalapi/search", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public SearchResponse search(@RequestBody BasicSearchRequestParameters parameters) {
        SearchRequest searchRequest = createSearchRequest(parameters);
        return handleSearchRequest(searchRequest);
    }

    //TODO Replace specific searches with general one. Set all settings that are available. What is actually used is later determined by the search type

    @Secured({"ROLE_USER"})
    @RequestMapping(value = "/internalapi/search/movie", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public SearchResponse movieSearch(@RequestBody MovieSearchRequestParameters parameters) {

        SearchRequest searchRequest = createSearchRequest(parameters);

        if (!Strings.isNullOrEmpty(parameters.getImdbId())) {
            searchRequest.getIdentifiers().put(IdType.IMDB, parameters.getImdbId());
        }
        if (!Strings.isNullOrEmpty(parameters.getTmdbId())) {
            searchRequest.getIdentifiers().put(IdType.TMDB, parameters.getTmdbId());
        }
        if (!Strings.isNullOrEmpty(parameters.getTitle())) {
            searchRequest.setTitle(parameters.getTitle());
        }


        return handleSearchRequest(searchRequest);
    }

    @Secured({"ROLE_USER"})
    @RequestMapping(value = "/internalapi/search/tv", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public SearchResponse tvSearch(@RequestBody TvSearchRequestParameters parameters) {

        SearchRequest searchRequest = createSearchRequest(parameters);

        if (!Strings.isNullOrEmpty(parameters.getTvrageId())) {
            searchRequest.getIdentifiers().put(IdType.TVRAGE, parameters.getTvrageId());
        }
        if (!Strings.isNullOrEmpty(parameters.getTvdbId())) {
            searchRequest.getIdentifiers().put(IdType.TVDB, parameters.getTvdbId());
        }
        if (!Strings.isNullOrEmpty(parameters.getTvmazeId())) {
            searchRequest.getIdentifiers().put(IdType.TVMAZE, parameters.getTvmazeId());
        }
        if (!Strings.isNullOrEmpty(parameters.getTitle())) {
            searchRequest.setTitle(parameters.getTitle());
        }

        return handleSearchRequest(searchRequest);
    }

    private SearchResponse handleSearchRequest(SearchRequest searchRequest) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        logger.info("New search request: " + searchRequest);

        org.nzbhydra.searching.SearchResult searchResult = searcher.search(searchRequest);
        SearchResponse response = new SearchResponse();

        List<SearchResult> transformedSearchResults = transformSearchResults(searchResult);
        response.setSearchResults(transformedSearchResults);

        for (Entry<Indexer, List<IndexerSearchResult>> entry : searchResult.getIndexerSearchResultMap().entrySet()) {
            //For now it's enough to get the data from the last metadata entry (even if multiple were done to get the needed amount of results)
            IndexerSearchResult indexerSearchResult = Iterables.getLast(entry.getValue());
            IndexerSearchMetaData indexerSearchMetaData = new IndexerSearchMetaData();
            indexerSearchMetaData.setDidSearch(true); //TODO
            indexerSearchMetaData.setErrorMessage(indexerSearchResult.getErrorMessage());
            indexerSearchMetaData.setHasMoreResults(indexerSearchResult.isHasMoreResults());
            indexerSearchMetaData.setIndexerName(indexerSearchResult.getIndexer().getName());
            indexerSearchMetaData.setLimit(indexerSearchResult.getLimit());
            indexerSearchMetaData.setNumberOfAvailableResults(indexerSearchResult.getTotalResults());
            indexerSearchMetaData.setNumberOfResults(indexerSearchResult.getSearchResultItems().size());
            indexerSearchMetaData.setOffset(indexerSearchResult.getOffset());
            indexerSearchMetaData.setResponseTime(indexerSearchResult.getResponseTime());
            indexerSearchMetaData.setTotalResultsKnown(indexerSearchResult.isTotalResultsKnown());
            indexerSearchMetaData.setWasSuccessful(indexerSearchResult.isWasSuccessful());
            response.getIndexerSearchMetaDatas().add(indexerSearchMetaData);
        }
        //TODO: Not picked handlers and why

        response.getIndexerSearchMetaDatas().sort(Comparator.comparing(IndexerSearchMetaData::getIndexerName));

        response.setLimit(searchRequest.getLimit().orElse(100)); //TODO: Can this ever be actually null?
        response.setOffset(searchRequest.getOffset().orElse(0)); //TODO: Can this ever be actually null?
        response.setNumberOfAvailableResults(searchResult.getIndexerSearchResultMap().values().stream().mapToInt(x -> Iterables.getLast(x).getTotalResults()).sum()); //TODO?
        response.setNumberOfRejectedResults(searchResult.getReasonsForRejection().entrySet().stream().mapToInt(Multiset.Entry::getCount).sum());
        response.setNumberOfResults(transformedSearchResults.size());
        response.setRejectedReasonsMap(searchResult.getReasonsForRejection().entrySet().stream().collect(Collectors.toMap(Multiset.Entry::getElement, Multiset.Entry::getCount)));
        response.setNotPickedIndexersWithReason(searchResult.getPickingResult().getNotPickedIndexersWithReason().entrySet().stream().collect(Collectors.toMap(x -> x.getKey().getName(), Entry::getValue)));

        logger.info("Search took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));

        return response;
    }

    private List<SearchResult> transformSearchResults(org.nzbhydra.searching.SearchResult searchResult) {
        List<SearchResult> transformedSearchResults = new ArrayList<>();
        List<TreeSet<SearchResultItem>> duplicateGroups = searchResult.getDuplicateDetectionResult().getDuplicateGroups();
        for (TreeSet<SearchResultItem> duplicateGroup : duplicateGroups) {
            int groupResultsIdentifier = random.nextInt();
            for (SearchResultItem item : duplicateGroup) {

                SearchResultBuilder builder = SearchResult.builder()
                        .category(item.getCategory().getName())
                        .comments(item.getCommentsCount())
                        .details_link(item.getDetails())
                        .downloadType(item.getDownloadType().name()) //TODO
                        .files(item.getFiles())
                        .grabs(item.getGrabs())
                        .has_nfo(item.getHasNfo().name())
                        .hash(groupResultsIdentifier)
                        .indexer(item.getIndexer().getName())
                        .indexerguid(item.getIndexerGuid())
                        .indexerscore(item.getIndexer().getConfig().getScore().orElse(null))
                        .link(nzbHandler.getNzbDownloadLink(item.getSearchResultId(), true)) //TODO construct using scheme, host, url base or external url
                        .searchResultId(item.getSearchResultId().toString())
                        .size(item.getSize())
                        .title(item.getTitle());
                builder = setSearchResultDateRelatedValues(builder, item);
                transformedSearchResults.add(builder.build());
            }
        }
        return transformedSearchResults;
    }


    private SearchResultBuilder setSearchResultDateRelatedValues(SearchResultBuilder builder, SearchResultItem item) {
        Instant date = item.getUsenetDate().orElse(item.getPubDate());
        long ageInDays = date.until(Instant.now(), ChronoUnit.DAYS);
        if (ageInDays > 0) {
            builder.age(ageInDays + "d");
        } else {
            long ageInHours = item.getPubDate().until(Instant.now(), ChronoUnit.HOURS);
            builder.age(ageInHours + "d");
        }
        builder = builder
                .age_precise(item.isAgePrecise())
                .epoch(date.getEpochSecond())
                .pubdate_utc("todo"); //TODO Check if needed at all
        return builder;
    }

    private SearchRequest createSearchRequest(@RequestBody BasicSearchRequestParameters parameters) {
        Category category = categoryProvider.getByName(parameters.getCategory());
        SearchType searchType = category.getSearchType() == null ? SearchType.SEARCH : category.getSearchType();
        SearchRequest searchRequest = searchRequestFactory.getSearchRequest(searchType, SearchSource.INTERNAL, category, parameters.getOffset(), parameters.getLimit());
        searchRequest.setIndexers(parameters.getIndexers());
        searchRequest.setQuery(parameters.getQuery());
        searchRequest.setMinage(parameters.getMinage());
        searchRequest.setMaxage(parameters.getMaxage());
        searchRequest.setMinsize(parameters.getMinsize());
        searchRequest.setMaxsize(parameters.getMaxsize());
        searchRequest.getInternalData().setLoadAll(parameters.getLoadAll() == null ? false : parameters.getLoadAll()); //TODO Should make sure that's never null...
        return searchRequest;
    }

}
