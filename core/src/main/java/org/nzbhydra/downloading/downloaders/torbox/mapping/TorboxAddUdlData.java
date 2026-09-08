

package org.nzbhydra.downloading.downloaders.torbox.mapping;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

@Data
@ReflectionMarker
@JsonIgnoreProperties(ignoreUnknown = true)
public class TorboxAddUdlData {
    private String hash;
    private String usenetdownload_id;
    /**
     * Returned by /torrents/createtorrent instead of {@link #usenetdownload_id}.
     * See <a href="https://github.com/TorBox-App/torbox-sdk-js/blob/main/documentation/services/TorrentsService.md">the Torbox SDK docs</a>.
     */
    private Integer torrent_id;
    private String auth_id;
}
