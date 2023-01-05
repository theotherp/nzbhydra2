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
import org.nzbhydra.config.notification.NotificationEventType;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.HashMap;
import java.util.Map;

@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
public class AuthFailureNotificationEvent implements NotificationEvent {

    private static final String IP = "ip";
    private static final String USERNAME = "username";
    private String ip;
    private String username;

    @Override
    public NotificationEventType getEventType() {
        return NotificationEventType.AUTH_FAILURE;
    }

    @Override
    public Map<String, String> getVariablesWithContent() {
        Map<String, String> variablesWithContent = new HashMap<>();
        variablesWithContent.put(IP, ip);
        variablesWithContent.put(USERNAME, username);
        return variablesWithContent;
    }

    @Override
    public NotificationEvent getTestInstance() {
        return new AuthFailureNotificationEvent("Some IP", "Some username");
    }


}
