package org.nzbhydra.web.searching;

import com.google.common.base.Stopwatch;
import com.google.common.collect.Iterables;
import com.google.common.collect.Multiset;
import org.nzbhydra.searching.*;
import org.nzbhydra.searching.searchmodules.Indexer;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.nzbhydra.searching.searchrequests.SearchRequestFactory;
import org.nzbhydra.web.searching.mapping.IndexerSearchMetaData;
import org.nzbhydra.web.searching.mapping.SearchResponse;
import org.nzbhydra.web.searching.mapping.SearchResult;
import org.nzbhydra.web.searching.mapping.SearchResult.SearchResultBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.Map.Entry;
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

    private Random random = new Random();

    @RequestMapping(value = "/internalapi/search", produces = "application/json")
    public SearchResponse search(@RequestParam(value = "query", required = false) String query,
                                 @RequestParam(value = "offset", required = false) Integer offset,
                                 @RequestParam(value = "limit", required = false) Integer limit,
                                 @RequestParam(value = "minsize", required = false) Integer minsize,
                                 @RequestParam(value = "maxsize", required = false) Integer maxsize,
                                 @RequestParam(value = "minage", required = false) Integer minage,
                                 @RequestParam(value = "maxage", required = false) Integer maxage,
                                 @RequestParam(value = "loadAll", required = false) Boolean loadAll,
                                 @RequestParam(value = "category", required = false) String category
    ) {

        Stopwatch stopwatch = Stopwatch.createStarted();
        SearchRequest searchRequest = searchRequestFactory.getSearchRequest(SearchType.SEARCH, SearchSource.INTERNAL, categoryProvider.getByName(category), offset, limit);
        searchRequest.setQuery(query);
        searchRequest.setOffset(offset);
        searchRequest.setMinage(minage);
        searchRequest.setMaxage(maxage);
        searchRequest.setMinsize(minsize);
        searchRequest.setMaxsize(maxsize);
        searchRequest.setSearchType(SearchType.SEARCH);
        searchRequest.getInternalData().setLoadAll(loadAll == null ? false : loadAll);

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
            indexerSearchMetaData.setNotPickedReason("TODO"); //TODO
            indexerSearchMetaData.setNumberOfAvailableResults(indexerSearchResult.getTotalResults());
            indexerSearchMetaData.setNumberOfResults(indexerSearchResult.getSearchResultItems().size());
            indexerSearchMetaData.setOffset(indexerSearchResult.getOffset());
            indexerSearchMetaData.setResponseTime(indexerSearchResult.getResponseTime());
            indexerSearchMetaData.setTotalResultsKnown(indexerSearchResult.isTotalResultsKnown());
            indexerSearchMetaData.setWasSuccessful(indexerSearchResult.isWasSuccessful());
            response.getIndexerSearchMetaDatas().add(indexerSearchMetaData);

        }
        response.getIndexerSearchMetaDatas().sort(Comparator.comparing(IndexerSearchMetaData::getIndexerName));

        response.setLimit(searchRequest.getLimit().orElse(100)); //TODO: Can this ever be actually null?
        response.setOffset(searchRequest.getOffset().orElse(0)); //TODO: Can this ever be actually null?
        response.setNumberOfAvailableResults(searchResult.getIndexerSearchResultMap().values().stream().mapToInt(x -> Iterables.getLast(x).getTotalResults()).sum()); //TODO
        response.setNumberOfRejectedResults(searchResult.getReasonsForRejection().entrySet().stream().mapToInt(Multiset.Entry::getCount).sum());
        response.setNumberOfResults(transformedSearchResults.size());
        response.setRejectedReasonsMap(new HashMap<>()); //TODO
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
                        .category("todo")
                        .comments(item.getComments())
                        .details_link(item.getDetails())
                        .downloadType(item.getDownloadType().name()) //TODO
                        .files(item.getFiles())
                        .grabs(item.getGrabs())
                        .has_nfo(item.getHasNfo().name())
                        .hash(groupResultsIdentifier)
                        .indexer(item.getIndexer().getName())
                        .indexerguid(item.getIndexerGuid())
                        .indexerscore(item.getIndexer().getConfig().getScore().orElse(null))
                        .link(item.getLink())
                        .searchResultId(item.getSearchResultId())
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
}
