/*
 *  (C) Copyright 2026 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.config.searching;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.config.sensitive.SensitiveData;
import org.nzbhydra.searching.db.IdentifierKeyValuePairTO;
import org.nzbhydra.springnative.ReflectionMarker;

import java.io.Serializable;
import java.util.HashSet;
import java.util.Set;

@Data
@ReflectionMarker
@NoArgsConstructor
@AllArgsConstructor
public class SavedSearch implements Serializable {

    private SearchType searchType;
    private String categoryName;
    @SensitiveData
    private String query;
    private Set<IdentifierKeyValuePairTO> identifiers = new HashSet<>();
    private Integer season;
    private String episode;
    private String title;
    private String author;
    private Integer minSize;
    private Integer maxSize;
    private Integer minAge;
    private Integer maxAge;
}
