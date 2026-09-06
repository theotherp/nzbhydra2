package org.nzbhydra.indexers;

import jakarta.persistence.EntityExistsException;
import lombok.extern.slf4j.Slf4j;
import org.nzbhydra.searching.SearchResultIdCalculator;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.searching.db.SearchResultIdAndHash;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;

@Component
@Slf4j
public class IndexerSearchResultPersistor {


    private final SearchResultRepository searchResultRepository;
    private final IndexerSearchResultOccurrenceRepository occurrenceRepository;

    public IndexerSearchResultPersistor(SearchResultRepository searchResultRepository, IndexerSearchResultOccurrenceRepository occurrenceRepository) {
        this.searchResultRepository = searchResultRepository;
        this.occurrenceRepository = occurrenceRepository;
    }

    /**
     * Stores the results which are not yet in the database. Afterwards {@link IndexerSearchResult#getSearchResultEntities()}
     * contains the newly created entities (with their internal IDs) and {@link IndexerSearchResult#getExistingSearchResultIds()}
     * the internal IDs of the results which were already known. Both the item's GUID and its search result ID are set to
     * the hash, which is the identifier visible to the outside.
     */
    @Transactional
    public List<SearchResultItem> persistSearchResults(Indexer<?> indexer, List<SearchResultItem> searchResultItems, IndexerSearchResult indexerSearchResult) {
        ArrayList<SearchResultEntity> searchResultEntities = new ArrayList<>();
        Map<Long, Long> existingIdsByHash = new HashMap<>();
        if (!searchResultItems.isEmpty()) {
            List<Long> hashes = searchResultItems.stream().map(SearchResultIdCalculator::calculateSearchResultHash).toList();
            for (SearchResultIdAndHash existing : searchResultRepository.findIdsAndHashesByHashIn(hashes)) {
                existingIdsByHash.put(existing.getHash(), existing.getId());
            }
        }
        for (SearchResultItem item : searchResultItems) {
            long hash = SearchResultIdCalculator.calculateSearchResultHash(item);
            if (!existingIdsByHash.containsKey(hash)) {
                SearchResultEntity searchResultEntity = new SearchResultEntity();

                //Set all entity relevant data
                searchResultEntity.setHash(hash);
                searchResultEntity.setIndexer(indexer.getIndexerEntity());
                searchResultEntity.setTitle(item.getTitle());
                searchResultEntity.setLink(item.getLink());
                searchResultEntity.setDetails(item.getDetails());
                searchResultEntity.setIndexerGuid(item.getIndexerGuid());
                searchResultEntity.setFirstFound(Instant.now());
                searchResultEntity.setDownloadType(item.getDownloadType());
                searchResultEntity.setPubDate(item.getPubDate());
                searchResultEntities.add(searchResultEntity);
            }
            //LATER Unify guid and searchResultId which are the same
            item.setGuid(hash);
            item.setSearchResultId(hash);
        }
        indexer.debug("Found {} results which were already in the database and {} new ones", existingIdsByHash.size(), searchResultEntities.size());
        indexerSearchResult.setExistingSearchResultIds(new HashSet<>(existingIdsByHash.values()));
        try {
            List<SearchResultEntity> savedEntities = searchResultRepository.saveAll(searchResultEntities);
            indexerSearchResult.setSearchResultEntities(new HashSet<>(savedEntities));
        } catch (EntityExistsException e) {
            indexer.error("Unable to save the search results to the database", e);
        }

        return searchResultItems;
    }

    @Transactional
    public void persistSearchResultOccurrences(IndexerSearchEntity indexerSearchEntity, Collection<Long> searchResultIds) {
        for (Long searchResultId : searchResultIds) {
            occurrenceRepository.merge(indexerSearchEntity.getId(), searchResultId);
        }
    }
}
