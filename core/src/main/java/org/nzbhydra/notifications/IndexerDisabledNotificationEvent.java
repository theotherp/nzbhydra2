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
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.notification.NotificationEventType;

import java.util.HashMap;
import java.util.Map;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class IndexerDisabledNotificationEvent implements NotificationEvent {

    private static final String INDEXER_NAME = "indexerName";
    private static final String STATE = "state";
    private static final String MESSAGE = "message";
    private String indexerName;
    private IndexerConfig.State state;
    private String message;

    @Override
    public NotificationEventType getEventType() {
        return NotificationEventType.INDEXER_DISABLED;
    }

    @Override
    public Map<String, String> getVariablesWithContent() {
        Map<String, String> variablesWithContent = new HashMap<>();
        variablesWithContent.put(INDEXER_NAME, indexerName);
        variablesWithContent.put(STATE, state.humanize());
        variablesWithContent.put(MESSAGE, message);
        return variablesWithContent;
    }

    @Override
    public NotificationEvent getTestInstance() {
        return new IndexerDisabledNotificationEvent("Some indexer", IndexerConfig.State.DISABLED_SYSTEM_TEMPORARY, "Some message");
    }


}
