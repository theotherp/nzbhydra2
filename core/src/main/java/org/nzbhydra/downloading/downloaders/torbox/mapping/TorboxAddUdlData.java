

package org.nzbhydra.downloading.downloaders.torbox.mapping;

import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

@Data
@ReflectionMarker
public class TorboxAddUdlData {
    private String hash;
    private String usenetdownload_id;
    private String auth_id;
}
