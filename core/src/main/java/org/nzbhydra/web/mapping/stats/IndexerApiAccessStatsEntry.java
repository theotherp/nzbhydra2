package org.nzbhydra.web.mapping.stats;

import lombok.Data;

@Data
public class IndexerApiAccessStatsEntry {
    private String indexerName = null;
    private Double percentSuccessful = null;
    private Double percentConnectionError = null;
    private Integer averageAccessesPerDay = null;

}
