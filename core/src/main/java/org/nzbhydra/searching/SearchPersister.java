package org.nzbhydra.searching;

import com.google.common.base.Stopwatch;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.indexers.IndexerSearchEntity;
import org.nzbhydra.indexers.IndexerSearchRepository;
import org.nzbhydra.indexers.IndexerSearchResultPersistor;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.searching.db.IdentifierKeyValuePair;
import org.nzbhydra.searching.db.SearchEntity;
import org.nzbhydra.searching.db.SearchRepository;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

/**
 * Writes searches and their results to the database. Whether the search history is kept at all depends on the
 * configuration; search results themselves are always saved because they're needed for downloads.
 */
@Component
public class SearchPersister {

    private static final Logger logger = LoggerFactory.getLogger(SearchPersister.class);

    private final ConfigProvider configProvider;
    private final TransactionTemplate transactionTemplate;
    private final SearchRepository searchRepository;
    private final IndexerSearchRepository indexerSearchRepository;
    private final SearchResultRepository searchResultRepository;
    private final IndexerSearchResultPersistor indexerSearchResultPersistor;

    public SearchPersister(ConfigProvider configProvider, TransactionTemplate transactionTemplate, SearchRepository searchRepository, IndexerSearchRepository indexerSearchRepository, SearchResultRepository searchResultRepository, IndexerSearchResultPersistor indexerSearchResultPersistor) {
        this.configProvider = configProvider;
        this.transactionTemplate = transactionTemplate;
        this.searchRepository = searchRepository;
        this.indexerSearchRepository = indexerSearchRepository;
        this.searchResultRepository = searchResultRepository;
        this.indexerSearchResultPersistor = indexerSearchResultPersistor;
    }

    /**
     * Builds the entity for a new search and saves it if the history is kept.
     *
     * @param rawQuery the query as entered by the user, i.e. before forbidden words were extracted from it
     */
    public SearchEntity createSearchEntity(SearchRequest searchRequest, String rawQuery) {
        SearchEntity searchEntity = new SearchEntity();
        searchEntity.setSource(searchRequest.getSource());
        searchEntity.setCategoryName(searchRequest.getCategory().getName());
        searchEntity.setQuery(rawQuery);
        searchEntity.setIdentifiers(searchRequest.getIdentifiers().entrySet().stream().filter(x -> x.getValue() != null).map(x -> new IdentifierKeyValuePair(x.getKey().name(), x.getValue())).collect(Collectors.toSet()));
        searchEntity.setSeason(searchRequest.getSeason().orElse(null));
        searchEntity.setEpisode(searchRequest.getEpisode().orElse(null));
        searchEntity.setSearchType(searchRequest.getSearchType());
        searchEntity.setTitle(searchRequest.getTitle().orElse(null));
        searchEntity.setAuthor(searchRequest.getAuthor().orElse(null));
        searchEntity.setMinAge(searchRequest.getMinage().orElse(null));
        searchEntity.setMaxAge(searchRequest.getMaxage().orElse(null));
        searchEntity.setMinSize(searchRequest.getMinsize().orElse(null));
        searchEntity.setMaxSize(searchRequest.getMaxsize().orElse(null));
        searchEntity.setSelectedIndexers(searchRequest.getIndexers().orElse(null));

        if (configProvider.getBaseConfig().getMain().isKeepHistory()) {
            transactionTemplate.executeWithoutResult(status -> searchRepository.save(searchEntity));
        }
        return searchEntity;
    }

    /**
     * Persists all indexer search results which were not persisted before.
     */
    public void persistNewIndexerSearchResults(SearchCacheEntry searchCacheEntry) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        int countEntities = 0;

        for (IndexerSearchCacheEntry indexerSearchCacheEntry : searchCacheEntry.getIndexerCacheEntries().values()) {
            List<IndexerSearchResult> indexerSearchResults = indexerSearchCacheEntry.getIndexerSearchResults();
            for (int i = indexerSearchCacheEntry.getPersistedResultCount(); i < indexerSearchResults.size(); i++) {
                persistIndexerSearchResult(searchCacheEntry, indexerSearchCacheEntry, indexerSearchResults.get(i));
                countEntities++;
            }
            indexerSearchCacheEntry.setPersistedResultCount(indexerSearchResults.size());
        }
        logger.debug(LoggingMarkers.PERFORMANCE, "Saving {} indexer search entities took {}ms", countEntities, stopwatch.elapsed(TimeUnit.MILLISECONDS));
    }

    private void persistIndexerSearchResult(SearchCacheEntry searchCacheEntry, IndexerSearchCacheEntry indexerSearchCacheEntry, IndexerSearchResult indexerSearchResult) {
        IndexerSearchEntity entity = indexerSearchCacheEntry.getIndexerSearchEntity();
        if (entity == null) {
            entity = new IndexerSearchEntity();
            entity.setIndexerEntity(indexerSearchResult.getIndexer().getIndexerEntity());
            entity.setSearchEntity(searchCacheEntry.getSearchEntity());
            entity.setResultsCount(indexerSearchResult.getTotalResults());
            entity.setSuccessful(indexerSearchResult.isWasSuccessful());
            entity.setResponseTime(indexerSearchResult.getResponseTime());
            entity.setErrorMessage(indexerSearchResult.getErrorMessage());
            indexerSearchCacheEntry.setIndexerSearchEntity(entity);
        }
        final IndexerSearchEntity finalEntity = entity;
        transactionTemplate.executeWithoutResult(status -> {
            IndexerSearchEntity savedEntity = finalEntity;
            if (configProvider.getBaseConfig().getMain().isKeepHistory()) {
                savedEntity = indexerSearchRepository.save(finalEntity);
                for (SearchResultEntity x : indexerSearchResult.getSearchResultEntities()) {
                    if (x.getIndexerSearchEntityId() == null) {
                        x.setIndexerSearchEntityId(savedEntity.getId());
                    }
                }
                if (!indexerSearchResult.getExistingSearchResultIds().isEmpty()) {
                    searchResultRepository.setIndexerSearchEntityIdWhereMissing(indexerSearchResult.getExistingSearchResultIds(), savedEntity.getId());
                }
                indexerSearchResultPersistor.persistSearchResultOccurrences(savedEntity, indexerSearchResult.getSearchResultIds());
            }
            searchResultRepository.saveAll(indexerSearchResult.getSearchResultEntities());
            indexerSearchCacheEntry.setIndexerSearchEntity(savedEntity);
        });
    }

}
