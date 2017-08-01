package org.nzbhydra.historystats.stats;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AverageResponseTime {

    private String indexer;
    private double avgResponseTime;
    private double delta;

}
