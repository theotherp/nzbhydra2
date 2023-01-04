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

@Data
@NoArgsConstructor
@AllArgsConstructor
public class QueueEntry {

    private String status;
    private Integer index;
    private String password;
    private String avg_age;
    private String script;
    private Boolean has_rating;
    private String mb;
    private String mbleft;
    private String mbmissing;
    private String size;
    private String sizeleft;
    private String filename;
    private String priority;
    private String cat;
    private String eta;
    private String timeleft;
    private String percentage;
    private String nzo_id;
    private String unpackopts;
}
