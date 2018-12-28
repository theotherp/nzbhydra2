package org.nzbhydra.indexers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class IndexerStatusesWeb {

    @Autowired
    private IndexerStatuses indexerStatuses;

    @Secured({"ROLE_USER"})
    @RequestMapping(value = "/internalapi/indexerstatuses")
    public List<IndexerStatuses.IndexerStatus> indexerStatuses() {
        return indexerStatuses.getSortedStatuses();
    }


}
