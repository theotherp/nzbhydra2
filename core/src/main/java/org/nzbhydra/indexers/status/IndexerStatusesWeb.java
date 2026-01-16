

package org.nzbhydra.indexers.status;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class IndexerStatusesWeb {

    @Autowired
    private IndexerStatusesAndLimits indexerStatuses;

    @Secured({"ROLE_USER"})
    @RequestMapping(value = "/internalapi/indexerstatuses")
    public List<IndexerStatusesAndLimits.IndexerStatus> indexerStatuses() {
        return indexerStatuses.getSortedStatuses();
    }


}
