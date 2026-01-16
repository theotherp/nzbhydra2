

package org.nzbhydra.downloading;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.Collection;
import java.util.Collections;
import java.util.Set;

@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
public class SaveOrSendResultsResponse {

    private boolean successful;
    private String message;
    private Collection<Long> addedIds;
    private Collection<Long> missedIds;

    public static SaveOrSendResultsResponse notOk(String message, Set<Long> missedIds) {
        return new SaveOrSendResultsResponse(false, message, Collections.emptySet(), missedIds);
    }


}
