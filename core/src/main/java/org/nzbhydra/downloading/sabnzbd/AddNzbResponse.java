package org.nzbhydra.downloading.sabnzbd;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class AddNzbResponse {

    private boolean status;
    @JsonProperty("nzo_ids")
    private List<String> nzoIds = new ArrayList<>();

}
