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

package org.nzbhydra.searching.dtoseventsenums;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class SearchResultWebTO {

    private String age;
    private Boolean age_precise;
    private String category;
    private String cover;
    private String date;
    private Integer comments;
    private String details_link;
    private String downloadType;
    private Long epoch;
    private Integer files;
    private Integer grabs;
    private Integer seeders;
    private Integer peers;
    private String hasNfo;
    private Integer hash;
    private String indexer;
    private String indexerguid;
    private Integer indexerscore;
    private String link;
    private String originalCategory;
    private String poster;
    private String searchResultId;
    private Long size;
    private String title;

}
