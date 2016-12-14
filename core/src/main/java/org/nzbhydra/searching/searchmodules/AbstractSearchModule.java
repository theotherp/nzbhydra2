package org.nzbhydra.searching.searchmodules;

import org.nzbhydra.database.IndexerEntity;
import org.nzbhydra.database.SearchResultEntity;
import org.nzbhydra.database.SearchResultRepository;
import org.nzbhydra.searching.IndexerConfig;
import org.nzbhydra.searching.SearchResultItem;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Component
public abstract class AbstractSearchModule implements SearchModule {
    protected IndexerEntity indexer;
    protected IndexerConfig config;

    @Autowired
    private SearchResultRepository searchResultRepository;

    public void initialize(IndexerConfig config, IndexerEntity indexer) {
        this.indexer = indexer;
        this.config = config;
    }

    protected void persistSearchResults(List<SearchResultItem> searchResultItems) {
        ArrayList<SearchResultEntity> searchResultEntities = new ArrayList<>();
        for (SearchResultItem item : searchResultItems) {
            SearchResultEntity searchResultEntity = searchResultRepository.findByIndexerAndIndexerGuid(indexer, item.getIndexerGuid());
            if (searchResultEntity == null) {
                searchResultEntity = new SearchResultEntity();

                //Set all entity relevant data
                searchResultEntity.setIndexer(indexer);
                searchResultEntity.setTitle(item.getTitle());
                searchResultEntity.setLink(item.getLink());
                searchResultEntity.setDetails(item.getDetails());
                searchResultEntity.setIndexerGuid(item.getIndexerGuid());
                searchResultEntity.setFirstFound(Instant.now());
                searchResultEntities.add(searchResultEntity);
            }
        }
        searchResultRepository.save(searchResultEntities);
    }

    protected int hashItem(SearchResultItem item) {
        return (indexer.getName() + item.getIndexerGuid()).hashCode();
    }
}
