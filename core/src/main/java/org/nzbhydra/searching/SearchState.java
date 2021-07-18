/*
 *  (C) Copyright 2021 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.searching;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
class SearchState {

    private long searchRequestId;
    private boolean indexerSelectionFinished = false;
    private boolean searchFinished = false;
    private int indexersSelected = 0;
    private int indexersFinished = 0;
    private List<SortableMessage> messages = new ArrayList<>();

    public SearchState(long searchRequestId) {
        this.searchRequestId = searchRequestId;
    }

}
