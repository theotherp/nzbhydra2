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

package org.nzbhydra.searching.dtoseventsenums;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchRequestParameters {
    protected String query;
    protected Integer offset;
    protected Integer limit;
    protected Integer minsize;
    protected Integer maxsize;
    protected Integer minage;
    protected Integer maxage;
    protected boolean loadAll;
    protected String category;
    protected String mode;
    protected Set<String> indexers;

    private String title;

    private String imdbId;
    private String tmdbId;

    private String tvrageId;
    private String tvdbId;
    private String tvmazeId;

    private Integer season;
    private String episode;

    private long searchRequestId; //Sent by the GUI to identify this search when getting updates for it

}
