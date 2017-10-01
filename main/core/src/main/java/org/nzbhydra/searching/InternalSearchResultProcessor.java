package org.nzbhydra.searching;

import com.google.common.base.Stopwatch;
import com.google.common.collect.Multiset;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.downloading.NzbHandler;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.searching.SearchResultWebTO.SearchResultWebTOBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map.Entry;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Component
public class InternalSearchResultProcessor {

    private static final Logger logger = LoggerFactory.getLogger(InternalSearchResultProcessor.class);

    @Autowired
    private NzbHandler nzbHandler;
    @Autowired
    private ConfigProvider configProvider;

    public SearchResponse createSearchResponse(org.nzbhydra.searching.SearchResult searchResult) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        SearchResponse searchResponse = new SearchResponse();

        searchResponse.setNumberOfAvailableResults(searchResult.getNumberOfTotalAvailableResults());
        searchResponse.setNumberOfRejectedResults(searchResult.getNumberOfRejectedResults());
        searchResponse.setRejectedReasonsMap(searchResult.getReasonsForRejection().entrySet().stream().collect(Collectors.toMap(Multiset.Entry::getElement, Multiset.Entry::getCount)));
        searchResponse.setIndexerSearchMetaDatas(createIndexerSearchMetaDatas(searchResult));
        searchResponse.setNotPickedIndexersWithReason(searchResult.getPickingResult().getNotPickedIndexersWithReason().entrySet().stream().collect(Collectors.toMap(x -> x.getKey().getName(), Entry::getValue)));
        searchResponse.setNumberOfProcessedResults(searchResult.getNumberOfProcessedResults());
        searchResponse.setNumberOfAcceptedResults(searchResult.getNumberOfAcceptedResults());

        List<SearchResultWebTO> transformedSearchResults = transformSearchResults(searchResult.getSearchResultItems());
        searchResponse.setSearchResults(transformedSearchResults);
        searchResponse.setOffset(searchResponse.getOffset());
        searchResponse.setLimit(searchResponse.getLimit());

        logger.debug(LoggingMarkers.PERFORMANCE, "Creating web response for search results took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return searchResponse;
    }

    private List<IndexerSearchMetaData> createIndexerSearchMetaDatas(org.nzbhydra.searching.SearchResult searchResult) {
        List<IndexerSearchMetaData> indexerSearchMetaDatas = new ArrayList<>();
        for (IndexerSearchResult indexerSearchResult : searchResult.getIndexerSearchResults()) {
            IndexerSearchMetaData indexerSearchMetaData = new IndexerSearchMetaData();
            indexerSearchMetaData.setDidSearch(true); //LATER
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

    private List<SearchResultWebTO> transformSearchResults(List<SearchResultItem> searchResultItems) {
        List<SearchResultWebTO> transformedSearchResults = new ArrayList<>();

        for (SearchResultItem item : searchResultItems) {
            SearchResultWebTOBuilder builder = SearchResultWebTO.builder()
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
        transformedSearchResults.sort(Comparator.comparingLong(SearchResultWebTO::getEpoch).reversed());
        return transformedSearchResults;
    }

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm");


    private SearchResultWebTOBuilder setSearchResultDateRelatedValues(SearchResultWebTOBuilder builder, SearchResultItem item) {
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
                .date(LocalDateTime.ofInstant(date, ZoneId.of("UTC")).format(DATE_FORMATTER))
                .epoch(date.getEpochSecond());
        return builder;
    }
}
