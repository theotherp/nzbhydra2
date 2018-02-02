/*
 *  (C) Copyright 2017 TheOtherP (theotherp@gmx.de)
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

package org.nzbhydra.downloading.downloaders.sabnzbd;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class HistoryEntry {
    private String action_line;
    private String series;
    private String show_details;
    private String script_log;
    private Object meta;
    private String fail_message;
    private Boolean loaded;
    private Long id;
    private String size;
    private String category;
    private String pp;
    private Integer retry;
    private Integer completeness;
    private String script;
    private String nzb_name;
    private Integer download_time;
    private String storage;
    private Boolean has_rating;
    private String status;
    private String script_line;
    private Long completed;
    private String nzo_id;
    private Long downloaded;
    private String report;
    private String password;
    private String path;
    private Long postproc_time;
    private String name;
    private String url;
    private String md5sum;
    private Long bytes;
    private String url_info;
    private List<StageLogEntry> stage_log = new ArrayList<>();

}
