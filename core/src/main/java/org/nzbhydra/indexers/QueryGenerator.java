

package org.nzbhydra.indexers;

import net.jodah.expiringmap.ExpirationPolicy;
import net.jodah.expiringmap.ExpiringMap;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.mediainfo.MediaIdType;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.indexers.exceptions.IndexerSearchAbortedException;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.mediainfo.InfoProviderException;
import org.nzbhydra.mediainfo.MediaInfo;
import org.nzbhydra.searching.searchrequests.InternalData;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

@Component
public class QueryGenerator {

    private static final Logger logger = LoggerFactory.getLogger(QueryGenerator.class);

    private final Map<SearchRequest, String> generatedQueries =
            ExpiringMap.builder()
                    .expiration(1, TimeUnit.MINUTES)
                    .expirationPolicy(ExpirationPolicy.CREATED)
                    .build();

    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private InfoProvider infoProvider;

    public synchronized String generateQueryIfApplicable(SearchRequest searchRequest, String query, Indexer indexer) throws IndexerSearchAbortedException {
        if (searchRequest.getQuery().isPresent()) {
            return searchRequest.getQuery().get();
        }

        final IndexerConfig config = indexer.getConfig();
        boolean indexerDoesntSupportRequiredSearchType = config.getSupportedSearchTypes().stream().noneMatch(x -> searchRequest.getSearchType().matches(x));
        boolean anyIdsAvailable = !searchRequest.getIdentifiers().isEmpty();
        boolean indexerDoesntSupportAnyOfTheProvidedIds = anyIdsAvailable && searchRequest.getIdentifiers().keySet().stream().noneMatch(x -> config.getSupportedSearchIds().contains(x));
        boolean queryGenerationPossible = !searchRequest.getIdentifiers().isEmpty() || searchRequest.getTitle().isPresent();
        boolean queryGenerationEnabled = searchRequest.meets(configProvider.getBaseConfig().getSearching().getGenerateQueries());
        final InternalData.FallbackState fallbackState = searchRequest.getInternalData().getFallbackStateByIndexer(config.getName());
        boolean fallbackRequested = fallbackState == InternalData.FallbackState.REQUESTED;

        if (!(fallbackRequested || (queryGenerationPossible && queryGenerationEnabled && (indexerDoesntSupportAnyOfTheProvidedIds || indexerDoesntSupportRequiredSearchType)))) {
            logger.debug("No query generation needed for {}. indexerDoesntSupportRequiredSearchType: {}. indexerDoesntSupportAnyOfTheProvidedIds: {}. queryGenerationPossible: {}. queryGenerationEnabled: {}. fallbackRequested: {}", indexer.getName(), indexerDoesntSupportRequiredSearchType, indexerDoesntSupportAnyOfTheProvidedIds, queryGenerationPossible, queryGenerationEnabled, fallbackRequested);
            return query;
        }
        if (generatedQueries.containsKey(searchRequest)) {
            return generatedQueries.get(searchRequest);
        }
        if (fallbackState == InternalData.FallbackState.REQUESTED) {
            searchRequest.getInternalData().setFallbackStateByIndexer(config.getName(), InternalData.FallbackState.USED); //
        }

        if (searchRequest.getTitle().isPresent()) {
            query = sanitizeTitleForQuery(searchRequest.getTitle().get());
            logger.debug("Search request provided title {}. Using that as query base.", query);
        } else if (searchRequest.getInternalData().getTitle().isPresent()) {
            query = searchRequest.getInternalData().getTitle().get();
            logger.debug("Using internally provided title {}", query);
        } else {
            Optional<Map.Entry<MediaIdType, String>> firstIdentifierEntry = searchRequest.getIdentifiers().entrySet().stream().filter(java.util.Objects::nonNull).findFirst();
            if (firstIdentifierEntry.isEmpty()) {
                throw new IndexerSearchAbortedException("Unable to generate query because no identifier is known");
            }
            try {
                MediaInfo mediaInfo = infoProvider.convert(searchRequest.getIdentifiers());
                if (mediaInfo.getTitle().isEmpty()) {
                    throw new IndexerSearchAbortedException("Unable to generate query because no title is known");
                }
                query = sanitizeTitleForQuery(mediaInfo.getTitle().get());

                //Add language for shows and movies
                logger.debug("Determined title to be {}. Using that as query base.", query);

            } catch (InfoProviderException e) {
                throw new IndexerSearchAbortedException("Error while getting infos to generate queries");
            }
        }

        if (searchRequest.getSeason().isPresent() && !fallbackRequested) { //Don't add season/episode string for fallback queries. Indexers usually still return correct results
            if (searchRequest.getEpisode().isPresent()) {
                logger.debug("Using season {} and episode {} for query generation", searchRequest.getSeason().get(), searchRequest.getEpisode().get());
                try {
                    int episodeInt = Integer.parseInt(searchRequest.getEpisode().get());
                    query += String.format(" s%02de%02d", searchRequest.getSeason().get(), episodeInt);
                } catch (NumberFormatException e) {
                    String extendWith = String.format(" s%02d", searchRequest.getSeason().get()) + searchRequest.getEpisode().get();
                    query += extendWith;
                    logger.debug("{} doesn't seem to be an integer, extending query with '{}'", searchRequest.getEpisode().get(), extendWith);
                }
            } else {
                logger.debug("Using season {} for query generation", searchRequest.getSeason().get());
                query += String.format(" s%02d", searchRequest.getSeason().get());
            }
        }

        if (searchRequest.getSearchType() == SearchType.BOOK && !config.getSupportedSearchTypes().contains(ActionAttribute.BOOK)) {
            if (searchRequest.getAuthor().isPresent()) {
                query += " " + searchRequest.getAuthor().get();
                logger.debug("Using author {} in query", searchRequest.getAuthor().get());
            }
        }

        logger.debug("{} does not support any of the supplied IDs or the requested search type. The following query was generated: {} ", indexer.getName(), query);

        generatedQueries.put(searchRequest, query);
        searchRequest.getInternalData().setQueryGenerated(true);
        return query;
    }

    private String sanitizeTitleForQuery(String query) {
        if (query == null) {
            return null;
        }
        String sanitizedQuery = query.replaceAll("[\\(\\)=@#\\$%\\^,\\?<>{}\\|!':]", "");
        if (!sanitizedQuery.equals(query)) {
            logger.debug("Removed illegal characters from title '{}'. Title that will be used for query is '{}'", query, sanitizedQuery);
        }
        return sanitizedQuery;
    }
}
