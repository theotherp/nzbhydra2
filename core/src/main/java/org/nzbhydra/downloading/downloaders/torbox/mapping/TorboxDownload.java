

package org.nzbhydra.downloading.downloaders.torbox.mapping;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

import java.time.Instant;
import java.util.List;

@Data
@ReflectionMarker
public class TorboxDownload {
    private long id;
    private Instant created_at;
    private Instant updated_at;
    private String auth_id;
    private String name;
    private String hash;
    @JsonProperty("download_state")
    private String downloadState;
    @JsonProperty("download_speed")
    private long downloadSpeedBytes;
    private String original_url;
    private int eta;
    private double progress;
    private long size;
    private String download_id;
    private List<TorboxFile> files;
    private boolean active;
    private boolean cached;
    private boolean download_present;
    private boolean download_finished;
    private Instant expires_at;
    private int server;
}