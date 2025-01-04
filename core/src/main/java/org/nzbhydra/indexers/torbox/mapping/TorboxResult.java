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
public class TorboxResult {
    private String hash;

    @JsonProperty("raw_title")
    private String rawTitle;

    private String title;

    @JsonProperty("title_parsed_data")
    private TitleParsedData titleParsedData;

    private String magnet;
    private Object torrent;

    @JsonProperty("last_known_seeders")
    private int lastKnownSeeders;

    @JsonProperty("last_known_peers")
    private int lastKnownPeers;

    private long size;
    private String tracker;
    private List<Object> categories;
    private int files;
    private String type;
    private Object nzb;
    private String age;
}
