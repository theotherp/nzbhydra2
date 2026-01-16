

package org.nzbhydra.downloading.downloaders.torbox.mapping;

import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

@Data
@ReflectionMarker
public class AddUDlResponse implements UsenetResponse {
    private boolean success;
    private String error;
    private String detail;
    private TorboxAddUdlData data;
}
