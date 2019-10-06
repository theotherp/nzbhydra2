package org.nzbhydra.historystats.stats;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class IndexerUniquenessScore {

    private String indexerName;
    private int uniquenessScore;

}
