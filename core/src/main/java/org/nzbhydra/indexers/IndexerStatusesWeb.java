package org.nzbhydra.indexers;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.List;

@RestController
public class IndexerStatusesWeb {

    private static final Logger logger = LoggerFactory.getLogger(IndexerStatusesWeb.class);

    @Autowired
    private IndexerStatusRepository indexerStatusRepository;

    @Secured({"ROLE_USER"})
    @RequestMapping(value = "/internalapi/indexerstatuses")
    public List<IndexerStatusEntity> indexerStatuses() {
        return getSortedStatuses();
    }

    @RequestMapping(value = "/internalapi/indexerstatuses/enable/{indexerName}", method = RequestMethod.POST)
    @Secured({"ROLE_ADMIN"})
    public ResponseEntity<List<IndexerStatusEntity>> reenableIndexer(@PathVariable String indexerName) {
        IndexerStatusEntity statusEntity = indexerStatusRepository.findByIndexerName(indexerName);
        statusEntity.setDisabledPermanently(false);
        statusEntity.setDisabledUntil(null);
        statusEntity.setLevel(0);
        statusEntity.setReason(null);
        indexerStatusRepository.save(statusEntity);

        logger.info("Reenable indexer {}", indexerName);

        List<IndexerStatusEntity> statuses = getSortedStatuses();
        return new ResponseEntity<>(statuses, HttpStatus.OK);
    }

    protected List<IndexerStatusEntity> getSortedStatuses() {
        List<IndexerStatusEntity> statuses = indexerStatusRepository.findAll();
        statuses.sort(Comparator.comparing(o -> o.getIndexer().getName().toLowerCase()));
        return statuses;
    }

}
