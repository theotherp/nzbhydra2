

package org.nzbhydra.downloading;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.Collection;
import java.util.Collections;

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
    private Collection<String> invalidIds;

    public FileZipResponse(boolean successful, String zipFilepath, String message, Collection<Long> addedIds, Collection<Long> missedIds) {
        this(successful, zipFilepath, message, addedIds, missedIds, Collections.emptyList());
    }
}
