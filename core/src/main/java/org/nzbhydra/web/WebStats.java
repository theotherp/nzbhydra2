package org.nzbhydra.web;

import org.nzbhydra.historystats.StatsResponse;
import org.nzbhydra.web.mapping.stats.StatsRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class WebStats {

    @Autowired
    private org.nzbhydra.historystats.Stats stats;

    @RequestMapping(value = "/internalapi/stats")
    @Secured({"ROLE_STATS"})
    public StatsResponse getAllStats(@RequestBody StatsRequest statsRequest) {

        return stats.getAllStats(statsRequest);
    }

}
