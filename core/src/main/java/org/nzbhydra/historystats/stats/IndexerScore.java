package org.nzbhydra.historystats.stats;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class IndexerScore {

    private String indexerName;
    private Integer averageUniquenessScore;
    private long involvedSearches;
    private long uniqueDownloads;

}
