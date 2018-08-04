package org.nzbhydra.historystats.stats;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SuccessfulDownloadsPerIndexer {
    private String indexerName;
    private int countAll;
    private int countSuccessful;
    private int countError;
    private Float percentSuccessful;
}
