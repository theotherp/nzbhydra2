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

package org.nzbhydra.config.searching;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.StringJoiner;
import java.util.regex.Pattern;

@Data
@ReflectionMarker
public class CustomQueryAndTitleMapping {

    private SearchType searchType;
    private AffectedValue affectedValue;
    private String from;
    private String to;
    @JsonIgnore
    private Pattern fromPattern;

    public CustomQueryAndTitleMapping() {
    }

    public CustomQueryAndTitleMapping(String configValue) {
        final String[] split = configValue.split(";");
        if (split.length != 4) {
            throw new IllegalArgumentException("Unable to parse value: " + configValue);
        }
        this.searchType = split[0].equals("null") ? SearchType.SEARCH : SearchType.valueOf(split[0].toUpperCase());
        this.affectedValue = AffectedValue.valueOf(split[1].toUpperCase());
        this.from = split[2];
        this.to = split[3];
    }

    @JsonIgnore
    public Pattern getFromPattern() {
        if (fromPattern == null) {
            String regex = from.replaceAll("\\{(?<groupName>[^:]*):(?<hydraContent>[^\\{\\}]*)\\}", "(?<hydra${groupName}>${hydraContent})");
            fromPattern = Pattern.compile(regex, Pattern.CASE_INSENSITIVE);
        }
        return fromPattern;
    }

    @Override
    public String toString() {
        return new StringJoiner(", ", CustomQueryAndTitleMapping.class.getSimpleName() + "[", "]")
            .add("from='" + from + "'")
            .add("to='" + to + "'")
            .toString();
    }
}
