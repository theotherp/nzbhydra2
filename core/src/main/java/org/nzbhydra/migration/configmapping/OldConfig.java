
package org.nzbhydra.migration.configmapping;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
@ReflectionMarker
public class OldConfig {

    @JsonProperty("auth")
    public Auth auth;
    @JsonProperty("categories")
    public Categories categories;
    @JsonProperty("downloaders")
    public List<Downloader> downloaders = new ArrayList<>();
    @JsonProperty("indexers")
    public List<Indexer> indexers = new ArrayList<>();
    @JsonProperty("main")
    public Main main;
    @JsonProperty("searching")
    public Searching searching;

}
