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

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

@Data
@ReflectionMarker
public class IndexerSearchMetaData {

    private boolean didSearch;
    private String errorMessage;
    private boolean hasMoreResults;
    private String indexerName;
    private String notPickedReason;
    private int numberOfAvailableResults;
    private int numberOfFoundResults;
    private int offset;
    @JsonSerialize(using = ToStringSerializer.class)
    private long responseTime;
    private boolean totalResultsKnown;
    private boolean wasSuccessful;

}
