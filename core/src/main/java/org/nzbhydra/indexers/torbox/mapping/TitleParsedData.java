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

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
@ReflectionMarker
public class TitleParsedData {
    private String resolution;
    private String quality;
    private int year;
    private String codec;
    private String audio;
    private Integer bitDepth;
    private String title;
    private String filetype;
    private Boolean hdr;
    private Boolean remux;
    private String encoder;
}
