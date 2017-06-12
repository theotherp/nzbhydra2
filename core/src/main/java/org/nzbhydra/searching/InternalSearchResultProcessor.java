package org.nzbhydra.searching;

import com.google.common.collect.Multiset;
import org.nzbhydra.NzbHandler;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.web.mapping.IndexerSearchMetaData;
import org.nzbhydra.web.mapping.SearchResponse;
import org.nzbhydra.web.mapping.SearchResult.SearchResultBuilder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map.Entry;
import java.util.stream.Collectors;

@Component
public class InternalSearchResultProcessor {

    @Autowired
    private NzbHandler nzbHandler;
    @Autowired
    private ConfigProvider configProvider;

    public SearchResponse createSearchResponse(org.nzbhydra.searching.SearchResult searchResult) {
        SearchResponse searchResponse = new SearchResponse();

        searchResponse.setNumberOfAvailableResults(searchResult.getNumberOfTotalAvailableResults());
        searchResponse.setNumberOfRejectedResults(searchResult.getNumberOfRejectedResults());
        searchResponse.setRejectedReasonsMap(searchResult.getReasonsForRejection().entrySet().stream().collect(Collectors.toMap(Multiset.Entry::getElement, Multiset.Entry::getCount)));
        searchResponse.setIndexerSearchMetaDatas(createIndexerSearchMetaDatas(searchResult));
        searchResponse.setNotPickedIndexersWithReason(searchResult.getPickingResult().getNotPickedIndexersWithReason().entrySet().stream().collect(Collectors.toMap(x -> x.getKey().getName(), Entry::getValue)));
        searchResponse.setNumberOfProcessedResults(searchResult.getNumberOfProcessedResults());
        searchResponse.setNumberOfAcceptedResults(searchResult.getNumberOfAcceptedResults());

        List<org.nzbhydra.web.mapping.SearchResult> transformedSearchResults = transformSearchResults(searchResult.getSearchResultItems());
        searchResponse.setSearchResults(transformedSearchResults);
        searchResponse.setOffset(searchResponse.getOffset());
        searchResponse.setLimit(searchResponse.getLimit());
        return searchResponse;
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

    private List<org.nzbhydra.web.mapping.SearchResult> transformSearchResults(List<SearchResultItem> searchResultItems) {
        List<org.nzbhydra.web.mapping.SearchResult> transformedSearchResults = new ArrayList<>();

        for (SearchResultItem item : searchResultItems) {
            SearchResultBuilder builder = org.nzbhydra.web.mapping.SearchResult.builder()
                    .category(configProvider.getBaseConfig().getSearching().isUseOriginalCategories() ? item.getOriginalCategory() : item.getCategory().getName())
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
        transformedSearchResults.sort(Comparator.comparingLong(org.nzbhydra.web.mapping.SearchResult::getEpoch).reversed());
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
                .epoch(date.getEpochSecond());
        return builder;
    }
}
