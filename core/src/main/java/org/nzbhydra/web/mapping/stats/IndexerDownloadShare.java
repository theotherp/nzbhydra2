package org.nzbhydra.web.mapping.stats;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class IndexerDownloadShare {

    private String indexerName;
    private float share;
}
