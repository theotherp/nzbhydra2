

package org.nzbhydra.config.indexer;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
public class CheckCapsResponse {
    private IndexerConfig indexerConfig;
    private boolean allCapsChecked;
    private boolean configComplete;
}
