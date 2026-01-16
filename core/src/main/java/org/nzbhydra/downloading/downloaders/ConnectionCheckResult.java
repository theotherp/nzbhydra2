

package org.nzbhydra.downloading.downloaders;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
public class ConnectionCheckResult {

    private boolean successful;
    private String message;

}
