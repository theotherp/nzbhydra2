

package org.nzbhydra.downloading.downloaders.sabnzbd.mapping;

import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

@Data
@ReflectionMarker
public class HistoryResponse {
    private History history;
}
