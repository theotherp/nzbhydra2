package org.nzbhydra.historystats;

import org.nzbhydra.historystats.stats.StatsRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class StatsWeb {

    @Autowired
    private org.nzbhydra.historystats.Stats stats;

    @RequestMapping(value = "/internalapi/stats")
    @Secured({"ROLE_STATS"})
    public StatsResponse getAllStats(@RequestBody StatsRequest statsRequest) {

        try {
            return stats.getAllStats(statsRequest);
        } catch (InterruptedException e) {
            throw new RuntimeException("The stats calculation took longer than 30 seconds and was aborted");
        }
    }

}
