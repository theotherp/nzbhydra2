package org.nzbhydra.historystats.stats;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class SuccessfulDownloadsPerIndexer {
    private String indexerName;
    private double percentage;
}
