package org.nzbhydra.searching.searchmodules;

import com.google.common.base.Stopwatch;
import org.nzbhydra.database.*;
import org.nzbhydra.searching.IndexerConfig;
import org.nzbhydra.searching.SearchResultItem;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Component
public abstract class AbstractIndexer implements Indexer {

    private static final Logger logger = LoggerFactory.getLogger(AbstractIndexer.class);

    protected IndexerEntity indexer;
    protected IndexerConfig config;

    @Autowired
    private IndexerRepository indexerRepository;
    @Autowired
    private SearchResultRepository searchResultRepository;
    @Autowired
    private IndexerApiAccessRepository indexerApiAccessRepository;

    public void initialize(IndexerConfig config, IndexerEntity indexer) {
        this.indexer = indexer;
        this.config = config;
    }

    @Transactional
    protected void persistSearchResults(List<SearchResultItem> searchResultItems) {
        Stopwatch stopwatch = Stopwatch.createStarted();
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
        logger.debug("Persisting {} search results took {}ms", searchResultItems.size(), stopwatch.elapsed(TimeUnit.MILLISECONDS));
    }

    protected void handleSuccess() {
        IndexerStatusEntity status = indexer.getStatus();
        status.setLevel(0);
        status.setDisabledPermanently(false);
        status.setDisabledUntil(null);
        status.setReason(null); //TODO Check if should be deleted or kept and displayed even when enabled
        indexerRepository.save(indexer);
    }

    protected void handleFailure(String reason, Boolean disablePermanently) {
        IndexerStatusEntity status = indexer.getStatus();
        if (status.getLevel() == 0) {
            status.setFirstFailure(Instant.now());
        }
        status.setLevel(status.getLevel()+1);
        status.setDisabledPermanently(disablePermanently);
        status.setLastFailure(Instant.now());
        status.setDisabledUntil(Instant.now().plus(1, ChronoUnit.HOURS));//TODO calculate
        status.setReason(reason);
        indexerRepository.save(indexer);
    }

    protected int hashItem(SearchResultItem item) {
        return (indexer.getName() + item.getIndexerGuid()).hashCode();
    }
}
