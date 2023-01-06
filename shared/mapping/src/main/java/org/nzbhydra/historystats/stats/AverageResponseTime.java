package org.nzbhydra.historystats.stats;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
public class AverageResponseTime {

    private String indexer;
    private double avgResponseTime;
    private double delta;

    public AverageResponseTime(String indexer, double avgResponseTime) {
        this.indexer = indexer;
        this.avgResponseTime = avgResponseTime;
    }
}
