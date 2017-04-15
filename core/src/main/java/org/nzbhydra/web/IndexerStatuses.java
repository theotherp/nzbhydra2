package org.nzbhydra.web;

import org.nzbhydra.database.IndexerStatusEntity;
import org.nzbhydra.database.IndexerStatusRepository;
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

import java.util.List;

@RestController
public class IndexerStatuses {

    private static final Logger logger = LoggerFactory.getLogger(IndexerStatuses.class);

    @Autowired
    private IndexerStatusRepository indexerStatusRepository;

    @Secured({"ROLE_USER"})
    @RequestMapping(value = "/internalapi/indexerstatuses")
    public List<IndexerStatusEntity> indexerStatuses() {
        return indexerStatusRepository.findAll();
    }

    @RequestMapping(value = "/internalapi/indexerstatuses/enable/{indexerName}", method = RequestMethod.POST)
    @Secured({"ROLE_ADMIN"})
    public ResponseEntity<List<IndexerStatusEntity>> reenableIndexer(@PathVariable String indexerName) {
        IndexerStatusEntity statusEntity = indexerStatusRepository.findByIndexerName(indexerName);
        statusEntity.setDisabledPermanently(false);
        statusEntity.setDisabledUntil(null);
        statusEntity.setLevel(0);
        indexerStatusRepository.save(statusEntity);

        logger.info("Reenable indexer {}", indexerName);

        return new ResponseEntity<>(indexerStatusRepository.findAll(), HttpStatus.OK);
    }

}
