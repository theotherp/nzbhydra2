

package org.nzbhydra.searching;

import org.nzbhydra.indexers.DetailsResult;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class DetailsProvider {

    private final SearchResultRepository searchResultRepository;
    private final SearchModuleProvider searchModuleProvider;

    public DetailsProvider(SearchResultRepository searchResultRepository, SearchModuleProvider searchModuleProvider) {
        this.searchResultRepository = searchResultRepository;
        this.searchModuleProvider = searchModuleProvider;
    }

    public DetailsResult getDetails(long resultId) {
        Optional<SearchResultEntity> searchResult = searchResultRepository.findById(resultId);
        if (searchResult.isEmpty()) {
            return null;
        }
        Indexer indexer = searchModuleProvider.getIndexerByName(searchResult.get().getIndexer().getName());
        try {
            return indexer.getDetails(searchResult.get().getIndexerGuid(), resultId);
        } catch (IndexerAccessException e) {
            return DetailsResult.unsuccessful(e.getMessage());
        }
    }
}
