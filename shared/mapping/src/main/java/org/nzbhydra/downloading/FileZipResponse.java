

package org.nzbhydra.downloading;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.Collection;

@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
public class FileZipResponse {

    private boolean successful;
    private String zipFilepath;
    private String message;
    private Collection<Long> addedIds;
    private Collection<Long> missedIds;
}
