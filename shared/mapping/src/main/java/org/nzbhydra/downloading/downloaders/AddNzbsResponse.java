

package org.nzbhydra.downloading.downloaders;

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
public class AddNzbsResponse {
    /**
     * Determines if the communication with the downloader was successful, not if all (or any) NZBs were successfully downloaded
     */
    private boolean successful;
    private String message;
    private Collection<Long> addedIds;
    private Collection<Long> missedIds;
    private Collection<String> invalidIds;

    public AddNzbsResponse(boolean successful, String message, Collection<Long> addedIds, Collection<Long> missedIds) {
        this(successful, message, addedIds, missedIds, Collections.emptyList());
    }
}
