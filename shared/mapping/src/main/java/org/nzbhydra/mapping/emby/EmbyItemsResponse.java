/*
 *  (C) Copyright 2025 TheOtherP (theotherp@posteo.net)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

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