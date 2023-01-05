/*
 *  (C) Copyright 2017 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.downloading.downloaders.sabnzbd.mapping;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.ArrayList;
import java.util.List;

@Data
@ReflectionMarker
@NoArgsConstructor
@AllArgsConstructor
public class Queue {

    private String status;
    private String speedlimit;
    private String speedlimit_abs;
    private Boolean paused;
    private Integer noofslots_total;
    private Integer noofslots;
    private Integer limit;
    private Integer start;
    private String eta;
    private String timeleft;
    private String speed;
    private String kbpersec;
    private String size;
    private String sizeleft;
    private String mb;
    private String mbleft;
    private List<QueueEntry> slots = new ArrayList<>();
    private List<String> categories = new ArrayList<>();
    private List<String> scripts = new ArrayList<>();
    private String diskspace1;
    private String diskspace2;
    private String diskspacetotal1;
    private String diskspacetotal2;
    private String diskspace1_norm;
    private String diskspace2_norm;
    private Boolean rating_enable;
    private String have_warnings;
    private String pause_int;
    private String loadavg;
    private String left_quota;
    private String refresh_rate;
    private String version;
    private Long finish;
    private String cache_art;
    private String cache_size;
    private String cache_max;
    private Object finishaction;
    private Boolean paused_all;
    private String quota;
    private Boolean have_quota;
    private String queue_details;
}
