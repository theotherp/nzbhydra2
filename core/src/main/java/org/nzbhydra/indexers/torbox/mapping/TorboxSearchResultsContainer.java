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

package org.nzbhydra.indexers.torbox.mapping;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data

public class TorboxSearchResultsContainer {

    private Object metadata;
    private List<TorboxResult> torrents;
    private List<TorboxResult> nzbs;
    @JsonProperty("time_taken")
    private double timeTaken;
    private boolean cached;
    @JsonProperty("total_torrents")
    private int totalTorrents;
    @JsonProperty("total_nzbs")
    private int totalNzbs;

}
