package org.nzbhydra.indexers;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.nzbhydra.config.IndexerConfig;

@Data
@AllArgsConstructor
public class CheckCapsRespone {
    private IndexerConfig indexerConfig;
    private boolean allChecked;
    private boolean necessaryConfigComplete;
}
