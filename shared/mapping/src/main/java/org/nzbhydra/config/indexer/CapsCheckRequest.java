

package org.nzbhydra.config.indexer;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
public class CapsCheckRequest {
    public enum CheckType {
        ALL,
        INCOMPLETE,
        SINGLE
    }

    private IndexerConfig indexerConfig;
    private CheckType checkType;
}
