/*
 *  (C) Copyright 2024 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.downloading.downloaders.torbox.mapping;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
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