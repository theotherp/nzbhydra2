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
public class DownloadCompletionNotificationEvent implements NotificationEvent {

    private static final String DOWNLOAD_RESULT = "downloadResult";
    private static final String TITLE = "title";
    private String title;
    private String downloadResult;

    @Override
    public NotificationEventType getEventType() {
        return NotificationEventType.RESULT_DOWNLOAD_COMPLETION;
    }

    @Override
    public Map<String, String> getVariablesWithContent() {
        Map<String, String> variablesWithContent = new HashMap<>();
        variablesWithContent.put(DOWNLOAD_RESULT, downloadResult);
        variablesWithContent.put(TITLE, title);
        return variablesWithContent;
    }

    @Override
    public NotificationEvent getTestInstance() {
        return new DownloadCompletionNotificationEvent("Some result", "Download successful");
    }


}
