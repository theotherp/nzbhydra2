

package org.nzbhydra.indexers.torbox.mapping;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.ArrayList;
import java.util.List;

@Data
@ReflectionMarker
public class TorboxSearchResultsContainer {

    private Object metadata;
    private List<TorboxResult> torrents = new ArrayList<>();
    private List<TorboxResult> nzbs = new ArrayList<>();
    @JsonProperty("time_taken")
    private double timeTaken;
    private boolean cached;
    @JsonProperty("total_torrents")
    private int totalTorrents;
    @JsonProperty("total_nzbs")
    private int totalNzbs;

}
