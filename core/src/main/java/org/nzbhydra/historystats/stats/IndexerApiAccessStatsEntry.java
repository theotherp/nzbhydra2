package org.nzbhydra.historystats.stats;

import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

@Data
@ReflectionMarker
public class IndexerApiAccessStatsEntry {
    private String indexerName = null;
    private Double percentSuccessful = null;
    private Double percentConnectionError = null;
    private Double averageAccessesPerDay = null;

}
