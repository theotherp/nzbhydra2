

package org.nzbhydra.downloading.downloaders.sabnzbd.mapping;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.ArrayList;
import java.util.List;

@Data
@ReflectionMarker
public class AddNzbResponse {

    private boolean status;
    @JsonProperty("nzo_ids")
    private List<String> nzoIds = new ArrayList<>();
    private String error;

}
