package org.nzbhydra.web;

import com.google.common.base.Stopwatch;
import com.google.common.base.Strings;
import com.google.common.collect.Multiset;
import org.nzbhydra.NzbHandler;
import org.nzbhydra.config.Category;
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

import javax.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map.Entry;
import java.util.Random;
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
    public SearchResponse search(@RequestBody BasicSearchRequestParameters parameters, HttpServletRequest request) {
        SearchRequest searchRequest = createSearchRequest(parameters, request);
        return handleSearchRequest(searchRequest);
    }

    //TODO Replace specific searches with general one. Set all settings that are available. What is actually used is later determined by the search type

    @Secured({"ROLE_USER"})
    @RequestMapping(value = "/internalapi/search/movie", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public SearchResponse movieSearch(@RequestBody MovieSearchRequestParameters parameters, HttpServletRequest request) {

        SearchRequest searchRequest = createSearchRequest(parameters, request);

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
    public SearchResponse tvSearch(@RequestBody TvSearchRequestParameters parameters, HttpServletRequest request) {

        SearchRequest searchRequest = createSearchRequest(parameters, request);

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

        response.setNumberOfAvailableResults(searchResult.getNumberOfTotalAvailableResults());
        response.setNumberOfRejectedResults(searchResult.getNumberOfRejectedResults());
        response.setRejectedReasonsMap(searchResult.getReasonsForRejection().entrySet().stream().collect(Collectors.toMap(Multiset.Entry::getElement, Multiset.Entry::getCount)));
        response.setIndexerSearchMetaDatas(createIndexerSearchMetaDatas(searchResult));
        response.setNotPickedIndexersWithReason(searchResult.getPickingResult().getNotPickedIndexersWithReason().entrySet().stream().collect(Collectors.toMap(x -> x.getKey().getName(), Entry::getValue)));
        response.setNumberOfProcessedResults(searchResult.getNumberOfProcessedResults());
        response.setNumberOfAcceptedResults(searchResult.getNumberOfAcceptedResults());

        List<SearchResult> transformedSearchResults = transformSearchResults(searchResult.getSearchResultItems());
//        int offset = searchRequest.getOffset().orElse(0);
//        int limit = searchRequest.getLimit().orElse(100); //TODO configurable#
//
//        OffsetAndLimitCalculation splice = searcher.calculateOffsetAndLimit(offset, limit, transformedSearchResults.size());
//        if (splice.getLimit() != 0) {
//            offset = splice.getOffset();
//            limit = splice.getLimit();
//            response.setOffset(splice.getOffset());
//            response.setLimit(splice.getLimit());
//            response.setSearchResults(transformedSearchResults.subList(offset, offset + limit));
//            logger.info("Returning results {}-{} from {} results in cache. A total of {} results is available from indexers", offset + 1, offset + limit, transformedSearchResults.size(), totalResultsAvailable);
//        }
        response.setSearchResults(transformedSearchResults);
        response.setOffset(response.getOffset());
        response.setLimit(response.getLimit());

        logger.info("Search took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));

        return response;
    }

    private List<IndexerSearchMetaData> createIndexerSearchMetaDatas(org.nzbhydra.searching.SearchResult searchResult) {
        List<IndexerSearchMetaData> indexerSearchMetaDatas = new ArrayList<>();
        for (IndexerSearchResult indexerSearchResult : searchResult.getIndexerSearchResults()) {
            IndexerSearchMetaData indexerSearchMetaData = new IndexerSearchMetaData();
            indexerSearchMetaData.setDidSearch(true); //TODO
            indexerSearchMetaData.setErrorMessage(indexerSearchResult.getErrorMessage());
            indexerSearchMetaData.setHasMoreResults(indexerSearchResult.isHasMoreResults());
            indexerSearchMetaData.setIndexerName(indexerSearchResult.getIndexer().getName());
            indexerSearchMetaData.setLimit(indexerSearchResult.getLimit());
            indexerSearchMetaData.setNumberOfAvailableResults(indexerSearchResult.getTotalResults());
            indexerSearchMetaData.setNumberOfFoundResults(indexerSearchResult.getSearchResultItems().size());
            indexerSearchMetaData.setOffset(indexerSearchResult.getOffset());
            indexerSearchMetaData.setResponseTime(indexerSearchResult.getResponseTime());
            indexerSearchMetaData.setTotalResultsKnown(indexerSearchResult.isTotalResultsKnown());
            indexerSearchMetaData.setWasSuccessful(indexerSearchResult.isWasSuccessful());
            indexerSearchMetaDatas.add(indexerSearchMetaData);
        }
        indexerSearchMetaDatas.sort(Comparator.comparing(IndexerSearchMetaData::getIndexerName));
        return indexerSearchMetaDatas;
    }

    private List<SearchResult> transformSearchResults(List<SearchResultItem> searchResultItems) {
        List<SearchResult> transformedSearchResults = new ArrayList<>();

        for (SearchResultItem item : searchResultItems) {
            SearchResultBuilder builder = SearchResult.builder()
                    .category(item.getCategory().getName())
                    .comments(item.getCommentsCount())
                    .details_link(item.getDetails())
                    .downloadType(item.getDownloadType().name())
                    .files(item.getFiles())
                    .grabs(item.getGrabs())
                    .hasNfo(item.getHasNfo().name())
                    .hash(item.getDuplicateIdentifier())
                    .indexer(item.getIndexer().getName())
                    .indexerguid(item.getIndexerGuid())
                    .indexerscore(item.getIndexer().getConfig().getScore().orElse(null))
                    .link(nzbHandler.getNzbDownloadLink(item.getSearchResultId(), true, item.getDownloadType()))
                    .searchResultId(item.getSearchResultId().toString())
                    .size(item.getSize())
                    .title(item.getTitle());
            builder = setSearchResultDateRelatedValues(builder, item);
            transformedSearchResults.add(builder.build());
        }
        transformedSearchResults.sort(Comparator.comparingLong(SearchResult::getEpoch).reversed());
        return transformedSearchResults;
    }


    private SearchResultBuilder setSearchResultDateRelatedValues(SearchResultBuilder builder, SearchResultItem item) {
        Instant date = item.getUsenetDate().orElse(item.getPubDate());
        long ageInDays = date.until(Instant.now(), ChronoUnit.DAYS);
        if (ageInDays > 0) {
            builder.age(ageInDays + "d");
        } else {
            long ageInHours = item.getPubDate().until(Instant.now(), ChronoUnit.HOURS);
            builder.age(ageInHours + "h");
        }
        builder = builder
                .age_precise(item.isAgePrecise())
                .epoch(date.getEpochSecond())
                .pubdate_utc("todo"); //TODO Check if needed at all
        return builder;
    }

    private SearchRequest createSearchRequest(@RequestBody BasicSearchRequestParameters parameters, HttpServletRequest request) {
        Category category = categoryProvider.getByName(parameters.getCategory());
        SearchType searchType = category.getSearchType() == null ? SearchType.SEARCH : category.getSearchType();
        SearchRequest searchRequest = searchRequestFactory.getSearchRequest(searchType, SearchSource.INTERNAL, category, parameters.getOffset(), parameters.getLimit());
        searchRequest.setIndexers(parameters.getIndexers());
        searchRequest.setQuery(parameters.getQuery());
        searchRequest.setMinage(parameters.getMinage());
        searchRequest.setMaxage(parameters.getMaxage());
        searchRequest.setMinsize(parameters.getMinsize());
        searchRequest.setMaxsize(parameters.getMaxsize());
        searchRequest.getInternalData().setUsernameOrIp(UsernameOrIpStorage.usernameOrIp.get());
        return searchRequest;
    }

}
