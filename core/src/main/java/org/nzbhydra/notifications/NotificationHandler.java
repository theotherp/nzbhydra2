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

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.core.JsonProcessingException;
import joptsimple.internal.Strings;
import lombok.AllArgsConstructor;
import lombok.Data;
import okhttp3.MediaType;
import org.nzbhydra.Jackson;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.NotificationConfig;
import org.nzbhydra.config.NotificationConfigEntry;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.webaccess.WebAccess;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class NotificationHandler {

    private static final Logger logger = LoggerFactory.getLogger(NotificationHandler.class);

    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private WebAccess webAccess;
    @Autowired
    private NotificationRepository notificationRepository;


    @EventListener
    public void handleNotification(NotificationEvent event) {
        logger.debug(LoggingMarkers.NOTIFICATIONS, "Retrieved notification event of type {}", event.getEventType());
        final NotificationConfig notificationConfig = configProvider.getBaseConfig().getNotificationConfig();


        final List<NotificationConfigEntry> configEntries = notificationConfig.getEntries().stream()
                .filter(x -> x.getEventType() == event.getEventType())
                .collect(Collectors.toList());

        if (configEntries.isEmpty()) {
            logger.debug(LoggingMarkers.NOTIFICATIONS, "No matching config entries found");
            return;
        }

        for (NotificationConfigEntry configEntry : configEntries) {
            logger.debug(LoggingMarkers.NOTIFICATIONS, "Found matching config entry with URLs {} and template {}", configEntry.getAppriseUrls(), configEntry.getBodyTemplate());
            final String notificationBody = fillTemplate(configEntry.getBodyTemplate(), event.getVariablesWithContent());
            final String notificationTitle = Strings.isNullOrEmpty(configEntry.getTitleTemplate()) ? null : fillTemplate(configEntry.getTitleTemplate(), event.getVariablesWithContent());
            logger.debug(LoggingMarkers.NOTIFICATIONS, "Sending notification for URLs {} to {} with body:\n{}", configEntry.getAppriseUrls(), notificationConfig.getAppriseApiUrl(), notificationBody);

            final String messageBody;
            try {
                messageBody = Jackson.JSON_MAPPER.writeValueAsString(new AppriseMessage(configEntry.getAppriseUrls(), notificationBody, notificationTitle, configEntry.getMessageType().name().toLowerCase()));
            } catch (JsonProcessingException e) {
                throw new RuntimeException("Unable to generate notification body", e);
            }

            notificationRepository.save(new NotificationEntity(event.getEventType(), NotificationEntity.MessageType.valueOf(configEntry.getMessageType().name()), notificationTitle, notificationBody, configEntry.getAppriseUrls(), Instant.now()));

            if (notificationConfig.getAppriseApiUrl() == null) {
                logger.debug(LoggingMarkers.NOTIFICATIONS, "No Apprise API URL set");
                return;
            }
            if (configEntry.getAppriseUrls() == null) {
                logger.debug(LoggingMarkers.NOTIFICATIONS, "No Apprise URLs set");
                return;
            }
            try {
                webAccess.postToUrl(notificationConfig.getAppriseApiUrl(), MediaType.get("application/json"), messageBody, Collections.emptyMap(), 10);
            } catch (IOException e) {
                logger.error("Error while sending notification", e);
            }


        }
    }

    private String fillTemplate(String template, Map<String, String> variablesWithContent) {
        String filledTemplate = template;
        for (Map.Entry<String, String> x : variablesWithContent.entrySet()) {
            template = template.replace("$" + x.getKey() + "$", x.getValue());
        }
        return template;
    }

    @Data
    @AllArgsConstructor
    private static class AppriseMessage {

        private String urls;
        private String body;
        @JsonInclude(JsonInclude.Include.NON_NULL)
        private String title;
        private String type;


    }

}
