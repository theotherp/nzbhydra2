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

package org.nzbhydra.config;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.config.notification.NotificationEventType;
import org.nzbhydra.config.sensitive.SensitiveData;
import org.nzbhydra.springnative.ReflectionMarker;


@SuppressWarnings("unchecked")
@Data
@ReflectionMarker
@NoArgsConstructor
@AllArgsConstructor
public class NotificationConfigEntry {

    public enum MessageType {
        INFO,
        SUCCESS,
        WARNING,
        FAILURE
    }

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private NotificationEventType eventType;
    @SensitiveData
    private String appriseUrls;
    private String titleTemplate;
    private String bodyTemplate;
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private MessageType messageType;

}
