

package org.nzbhydra.downloading.downloaders.torbox.mapping;

import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.List;

@Data
@ReflectionMarker
public class UsenetListResponse implements UsenetResponse {
    private boolean success;
    private String error;
    private String detail;
    private List<TorboxDownload> data;
}