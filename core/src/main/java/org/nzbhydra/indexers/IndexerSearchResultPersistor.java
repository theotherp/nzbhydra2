

package org.nzbhydra.indexers;

import jakarta.persistence.EntityExistsException;
import lombok.extern.slf4j.Slf4j;
import org.nzbhydra.searching.SearchResultIdCalculator;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Component
@Slf4j
public class IndexerSearchResultPersistor {


    private final SearchResultRepository searchResultRepository;
    private final IndexerSearchResultOccurrenceRepository occurrenceRepository;

    public IndexerSearchResultPersistor(SearchResultRepository searchResultRepository, IndexerSearchResultOccurrenceRepository occurrenceRepository) {
        this.searchResultRepository = searchResultRepository;
        this.occurrenceRepository = occurrenceRepository;
    }

    @Transactional
    public List<SearchResultItem> persistSearchResults(Indexer<?> indexer, List<SearchResultItem> searchResultItems, IndexerSearchResult indexerSearchResult) {
        ArrayList<SearchResultEntity> searchResultEntities = new ArrayList<>();
        List<Long> resultIds = searchResultItems.stream().map(SearchResultIdCalculator::calculateSearchResultId).toList();
        Set<SearchResultEntity> existingEntities = new HashSet<>(searchResultRepository.findAllById(resultIds));
        Set<Long> alreadySavedIds = existingEntities.stream().map(SearchResultEntity::getId).collect(Collectors.toSet());
        for (SearchResultItem item : searchResultItems) {
            long guid = SearchResultIdCalculator.calculateSearchResultId(item);
            if (!alreadySavedIds.contains(guid)) {
                SearchResultEntity searchResultEntity = new SearchResultEntity();

                //Set all entity relevant data
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
            item.setGuid(guid);
            item.setSearchResultId(guid);
        }
        indexer.debug("Found {} results which were already in the database and {} new ones", alreadySavedIds.size(), searchResultEntities.size());
        try {
            List<SearchResultEntity> savedEntities = searchResultRepository.saveAll(searchResultEntities);
            existingEntities.addAll(savedEntities);
            indexerSearchResult.setSearchResultEntities(existingEntities);
        } catch (EntityExistsException e) {
            indexer.error("Unable to save the search results to the database", e);
        }

        return searchResultItems;
    }

    @Transactional
    public void persistSearchResultOccurrences(IndexerSearchEntity indexerSearchEntity, Set<SearchResultEntity> searchResultEntities) {
        for (SearchResultEntity searchResult : searchResultEntities) {
            occurrenceRepository.merge(indexerSearchEntity.getId(), searchResult.getId());
        }
    }
}
