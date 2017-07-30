package org.nzbhydra.web.mapping.stats;

import lombok.Data;

@Data
public class DownloadPerAgeStats {
    private Integer percentOlder1000 = null;
    private Integer percentOlder2000 = null;
    private Integer percentOlder3000 = null;
    private Integer averageAge = null;

}
