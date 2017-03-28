package org.nzbhydra.web;

import org.nzbhydra.database.IndexerStatusEntity;
import org.nzbhydra.database.IndexerStatusRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class IndexerStatuses {

    @Autowired
    private IndexerStatusRepository indexerStatusRepository;

    @RequestMapping(value = "/internalapi/indexerstatuses")
    public List<IndexerStatusEntity> indexerStatuses() {
        return indexerStatusRepository.findAll();
    }

}
