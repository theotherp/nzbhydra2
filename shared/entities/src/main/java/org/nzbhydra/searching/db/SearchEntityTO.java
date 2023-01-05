/*
 *  (C) Copyright 2023 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.searching.db;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.springnative.ReflectionMarker;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;


@Data
@ReflectionMarker
@NoArgsConstructor
public class SearchEntityTO {

    private int id;
    private SearchSource source;
    private SearchType searchType;
    private Instant time;
    private Set<IdentifierKeyValuePair> identifiers = new HashSet<>();
    private String categoryName;
    private String query;
    private Integer season;
    private String episode;
    private String title;
    private String author;
    private String username;
    private String ip;
    private String userAgent;


}
