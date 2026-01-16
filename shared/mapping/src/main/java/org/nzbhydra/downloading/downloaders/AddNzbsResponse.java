

package org.nzbhydra.downloading.downloaders;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.Collection;

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
}
