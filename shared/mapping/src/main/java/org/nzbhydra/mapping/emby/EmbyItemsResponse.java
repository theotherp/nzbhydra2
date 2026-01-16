

package org.nzbhydra.mapping.emby;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.List;
import java.util.Map;

@Data
@ReflectionMarker
@JsonIgnoreProperties(ignoreUnknown = true)
public class EmbyItemsResponse {
    @JsonProperty("Items")
    private List<Item> items;

    @JsonProperty("TotalRecordCount")
    private int totalRecordCount;

    @Data
    @ReflectionMarker
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Item {
        @JsonProperty("Name")
        private String name;

        @JsonProperty("ServerId")
        private String serverId;

        @JsonProperty("Id")
        private String id;

        @JsonProperty("IsFolder")
        private boolean isFolder;

        @JsonProperty("Type")
        private String type;

        @JsonProperty("AirDays")
        private List<String> airDays;

        @JsonProperty("ImageTags")
        private Map<String, String> imageTags;

        @JsonProperty("BackdropImageTags")
        private List<String> backdropImageTags;
    }
}