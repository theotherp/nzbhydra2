

package org.nzbhydra.downloading.downloaders.torbox.mapping;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

import java.time.Instant;
import java.util.List;

@Data
@ReflectionMarker
@JsonIgnoreProperties(ignoreUnknown = true)
public class TorboxDownload {
    @JsonSetter(nulls = Nulls.SKIP)
    private long id;
    private Instant cached_at;
    private Instant created_at;
    private Instant updated_at;
    private String auth_id;
    private String name;
    private String hash;
    @JsonProperty("download_state")
    private String downloadState;
    @JsonSetter(nulls = Nulls.SKIP)
    @JsonProperty("download_speed")
    private long downloadSpeedBytes;
    private String original_url;
    @JsonSetter(nulls = Nulls.SKIP)
    private int eta;
    @JsonSetter(nulls = Nulls.SKIP)
    private double progress;
    @JsonSetter(nulls = Nulls.SKIP)
    private long size;
    private String download_id;
    private List<TorboxFile> files;
    @JsonSetter(nulls = Nulls.SKIP)
    private boolean active;
    @JsonSetter(nulls = Nulls.SKIP)
    private boolean cached;
    @JsonSetter(nulls = Nulls.SKIP)
    private boolean download_present;
    @JsonSetter(nulls = Nulls.SKIP)
    private boolean download_finished;
    private Instant expires_at;
    @JsonSetter(nulls = Nulls.SKIP)
    private int server;
}