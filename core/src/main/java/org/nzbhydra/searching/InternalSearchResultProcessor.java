package org.nzbhydra.searching;

import com.google.common.base.Stopwatch;
import com.google.common.collect.Multiset;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.downloading.FileDownloadEntity;
import org.nzbhydra.downloading.FileDownloadRepository;
import org.nzbhydra.downloading.FileHandler;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchMetaData;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.dtoseventsenums.SearchResultWebTO;
import org.nzbhydra.searching.dtoseventsenums.SearchResultWebTO.SearchResultWebTOBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.text.DecimalFormat;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map.Entry;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Component
public class InternalSearchResultProcessor {

    private static final Logger logger = LoggerFactory.getLogger(InternalSearchResultProcessor.class);

    @Autowired
    private FileHandler nzbHandler;
    @Autowired
    private ConfigProvider configProvider;

    @Autowired
    private FileDownloadRepository fileDownloadRepository;

    public SearchResponse createSearchResponse(org.nzbhydra.searching.SearchResult searchResult) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        SearchResponse searchResponse = new SearchResponse();

        searchResponse.setNumberOfAvailableResults(searchResult.getNumberOfTotalAvailableResults());
        searchResponse.setNumberOfRejectedResults(searchResult.getNumberOfRejectedResults());
        searchResponse.setRejectedReasonsMap(searchResult.getReasonsForRejection().entrySet().stream().collect(Collectors.toMap(Multiset.Entry::getElement, Multiset.Entry::getCount)));
        searchResponse.setIndexerSearchMetaDatas(createIndexerSearchMetaDatas(searchResult));
        searchResponse.setNotPickedIndexersWithReason(searchResult.getIndexerSelectionResult().getNotPickedIndexersWithReason().entrySet().stream().collect(Collectors.toMap(x -> x.getKey().getName(), Entry::getValue)));
        searchResponse.setNumberOfProcessedResults(searchResult.getNumberOfProcessedResults());
        searchResponse.setNumberOfAcceptedResults(searchResult.getNumberOfAcceptedResults());
        searchResponse.setNumberOfDuplicateResults(searchResult.getNumberOfFoundDuplicates());

        List<SearchResultWebTO> transformedSearchResults = transformSearchResults(searchResult.getSearchResultItems());
        searchResponse.setSearchResults(transformedSearchResults);
        searchResponse.setOffset(searchResult.getOffset());
        searchResponse.setLimit(searchResult.getLimit());

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

        final List<Long> guids = searchResultItems.stream().map(SearchResultItem::getGuid).collect(Collectors.toList());
        final Collection<FileDownloadEntity> alreadyDownloaded = fileDownloadRepository.findBySearchResultIdIn(guids);

        DecimalFormat df = new DecimalFormat();
        df.setMaximumFractionDigits(0);
        for (SearchResultItem item : searchResultItems) {
            SearchResultWebTOBuilder builder = SearchResultWebTO.builder()
                    .category(configProvider.getBaseConfig().getSearching().isUseOriginalCategories() ? item.getOriginalCategory() : item.getCategory().getName())
                    .comments(item.getCommentsCount())
                    .cover(item.getCover())
                    .details_link(item.getDetails())
                    .downloadType(item.getDownloadType().name())
                    .files(item.getFiles())
                    .grabs(item.getGrabs())
                    .seeders(item.getSeeders())
                    .peers(item.getPeers())
                    .hasNfo(item.getHasNfo().name())
                    .hash(item.getDuplicateIdentifier())
                    .indexer(item.getIndexer().getName())
                    .indexerguid(item.getIndexerGuid())
                    .indexerscore(item.getIndexer().getConfig().getScore())
                    .link(nzbHandler.getDownloadLinkForResults(item.getSearchResultId(), true, item.getDownloadType()))
                    .originalCategory(item.getOriginalCategory())
                    .poster(item.getPoster().orElse(null))
                    .searchResultId(item.getSearchResultId().toString())
                    .size(item.getSize())
                    .title(item.getTitle())
                    .source(item.getSource().orElse(null));
            builder = setSearchResultDateRelatedValues(builder, item);
            if (item.getAttributes().containsKey("season")) {
                builder.season(item.getAttributes().get("season"));
            }
            if (item.getAttributes().containsKey("episode")) {
                builder.episode(item.getAttributes().get("episode"));
            }
            if (item.getAttributes().containsKey("showtitle")) {
                builder.showtitle(item.getAttributes().get("showtitle"));
            }
            if (item.getAttributes().containsKey("downloadvolumefactor") && item.getAttributes().containsKey("uploadvolumefactor")) {
                final float dl = Float.parseFloat(item.getAttributes().get("downloadvolumefactor"));
                final float ul = Float.parseFloat(item.getAttributes().get("uploadvolumefactor"));
                if (Float.compare(dl, 0F) == 0) {
                    builder.torrentDownloadFactor("Freelech");
                } else {
                    int ratio = (int) (100F / (ul / dl));
                    if (ratio != 100) {
                        builder.torrentDownloadFactor(df.format(ratio) + "%");
                    }
                }
            }

            final Optional<FileDownloadEntity> matchingDownload = alreadyDownloaded.stream().filter(x -> x.getSearchResult().getId() == item.getSearchResultId()).findFirst();
            if (matchingDownload.isPresent()) {
                builder.downloadedAt(DATE_TIME_FORMATTER.format(LocalDateTime.ofInstant(matchingDownload.get().getTime(), ZoneId.of("UTC"))));
            }

            transformedSearchResults.add(builder.build());
        }


        transformedSearchResults.sort(Comparator.comparingLong(SearchResultWebTO::getEpoch).reversed());
        return transformedSearchResults;
    }

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd-MM-yyyy");


    protected SearchResultWebTOBuilder setSearchResultDateRelatedValues(SearchResultWebTOBuilder builder, SearchResultItem item) {
        Instant date = item.getBestDate();
        long ageInDays = date.until(Instant.now(), ChronoUnit.DAYS);
        if (ageInDays > 0) {
            builder.age(ageInDays + "d");
        } else {
            long ageInHours = date.until(Instant.now(), ChronoUnit.HOURS);
            if (ageInHours > 0) {
                builder.age(ageInHours + "h");
            } else {
                long ageInMinutes = date.until(Instant.now(), ChronoUnit.MINUTES);
                builder.age(ageInMinutes + "m");
            }
        }
        builder = builder
                .age_precise(item.isAgePrecise())
                .date(LocalDateTime.ofInstant(date, ZoneId.of("UTC")).format(item.isAgePrecise() ? DATE_TIME_FORMATTER : DATE_FORMATTER))
                .epoch(date.getEpochSecond());
        return builder;
    }
}
