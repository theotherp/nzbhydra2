/*
 *  (C) Copyright 2020 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.notifications;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.Map;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class DownloadNotificationEvent implements NotificationEvent {

    private static final String INDEXER_NAME = "indexerName";
    private static final String TITLE = "title";
    private static final String AGE = "age";
    private static final String SOURCE = "source";
    private String indexerName;
    private String title;
    private String age;
    private String source;

    @Override
    public NotificationEventType getEventType() {
        return NotificationEventType.RESULT_DOWNLOAD;
    }

    @Override
    public Map<String, String> getVariablesWithContent() {
        Map<String, String> variablesWithContent = new HashMap<>();
        variablesWithContent.put(INDEXER_NAME, indexerName);
        variablesWithContent.put(TITLE, title);
        variablesWithContent.put(AGE, age);
        variablesWithContent.put(SOURCE, source);
        return variablesWithContent;
    }

    @Override
    public NotificationEvent getTestInstance() {
        return new DownloadNotificationEvent("Some Indexer", "Some result", "100d", "NZB");
    }


}
