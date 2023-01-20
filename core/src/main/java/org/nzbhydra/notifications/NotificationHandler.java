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
import com.google.common.base.Joiner;
import joptsimple.internal.Strings;
import lombok.AllArgsConstructor;
import lombok.Data;
import okhttp3.MediaType;
import org.nzbhydra.Jackson;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.NotificationConfig;
import org.nzbhydra.config.NotificationConfigEntry;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.springnative.ReflectionMarker;
import org.nzbhydra.webaccess.WebAccess;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

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
            .toList();

        if (configEntries.isEmpty()) {
            logger.debug(LoggingMarkers.NOTIFICATIONS, "No matching config entries found");
            return;
        }

        for (NotificationConfigEntry configEntry : configEntries) {
            logger.debug(LoggingMarkers.NOTIFICATIONS, "Found matching config entry with URLs {} and template {}", configEntry.getAppriseUrls(), configEntry.getBodyTemplate());
            final String notificationBody = fillTemplate(configEntry.getBodyTemplate(), event.getVariablesWithContent());
            final String notificationTitle = Strings.isNullOrEmpty(configEntry.getTitleTemplate()) ? null : fillTemplate(configEntry.getTitleTemplate(), event.getVariablesWithContent());

            boolean isFilteredOut = false;
            for (String filterOut : configProvider.getBaseConfig().getNotificationConfig().getFilterOuts()) {
                if (filterOut.startsWith("/") && filterOut.endsWith("/")) {
                    final String regex = filterOut.substring(1, filterOut.length() - 1);
                    final Pattern pattern;
                    try {
                        pattern = Pattern.compile(regex, Pattern.CASE_INSENSITIVE);
                    } catch (Exception e) {
                        logger.error("Unable to parse regex: {}", regex);
                        continue;
                    }
                    if (pattern.matcher(notificationBody).find()) {
                        isFilteredOut = true;
                    }
                } else if (notificationBody.toLowerCase().contains(filterOut.toLowerCase())) {
                    isFilteredOut = true;
                }
                if (isFilteredOut) {
                    logger.debug(LoggingMarkers.NOTIFICATIONS, "Notification with body matches filter-out \"{}\":\n{}", filterOut, notificationBody);
                }
            }
            if (isFilteredOut) {
                continue;
            }

            logger.debug(LoggingMarkers.NOTIFICATIONS, "Sending notification for URLs {} to {} with body:\n{}", configEntry.getAppriseUrls(), notificationConfig.getAppriseApiUrl(), notificationBody);
            final String messageBody;
            try {
                messageBody = Jackson.JSON_MAPPER.writeValueAsString(new AppriseMessage(configEntry.getAppriseUrls(), notificationBody, notificationTitle, configEntry.getMessageType().name().toLowerCase()));
            } catch (JsonProcessingException e) {
                throw new RuntimeException("Unable to generate notification body", e);
            }

            notificationRepository.save(new NotificationEntity(event.getEventType(), NotificationMessageType.valueOf(configEntry.getMessageType().name()), notificationTitle, notificationBody, configEntry.getAppriseUrls(), Instant.now()));

            if (notificationConfig.getAppriseType() == NotificationConfig.AppriseType.NONE) {
                logger.debug(LoggingMarkers.NOTIFICATIONS, "Apprise type set to None");
                return;
            }
            if (configEntry.getAppriseUrls() == null) {
                logger.debug(LoggingMarkers.NOTIFICATIONS, "No Apprise URLs set");
                return;
            }
            if (notificationConfig.getAppriseType() == NotificationConfig.AppriseType.API) {
                callAppriseApi(notificationConfig, messageBody);
            } else if (notificationConfig.getAppriseType() == NotificationConfig.AppriseType.CLI) {
                callAppriseCli(notificationConfig, configEntry, notificationTitle, notificationBody);
            } else {
                throw new IllegalArgumentException("Unexpected apprise type " + notificationConfig.getAppriseType());
            }


        }
    }

    private void callAppriseCli(NotificationConfig notificationConfig, NotificationConfigEntry configEntry, String notificationTitle, String notificationBody) {
        List<String> commands = new ArrayList<>();
        commands.add(notificationConfig.getAppriseCliPath());
        if (notificationTitle != null) {
            commands.add("-t");
            commands.add(notificationTitle.replace("\"", "\\\""));
        }
        commands.add("-b");
        commands.add(notificationBody.replace("\"", "\\\""));
        commands.addAll(Arrays.asList(configEntry.getAppriseUrls().split(",")));
        final String commandLine = Joiner.on(" ").join(commands);
        logger.debug(LoggingMarkers.NOTIFICATIONS, "Calling apprise command {}", commandLine);
        ProcessBuilder processBuilder = new ProcessBuilder(commands);
        final int exitCode;
        try {
            final Process process = processBuilder.start();
            exitCode = process.waitFor();
            if (exitCode != 0) {
                logger.error("Unexpected exit code {} while executing apprise command {}", exitCode, commandLine);
            }
        } catch (IOException | InterruptedException e) {
            logger.error("Unexpected error executing apprise command {}", commandLine);
        }
    }

    private void callAppriseApi(NotificationConfig notificationConfig, String messageBody) {
        try {
            final String notifyUrl = UriComponentsBuilder.fromHttpUrl(notificationConfig.getAppriseApiUrl()).path("/notify").toUriString().replace("/notify/notify", "/notify");
            logger.debug(LoggingMarkers.NOTIFICATIONS, "Posting body to {}:\n{}", notifyUrl, messageBody);
            webAccess.postToUrl(notificationConfig.getAppriseApiUrl(), MediaType.get("application/json"), messageBody, Collections.emptyMap(), 10);
        } catch (IOException e) {
            logger.error("Error while sending notification", e);
        }
    }

    private String fillTemplate(String template, Map<String, String> variablesWithContent) {
        for (Map.Entry<String, String> x : variablesWithContent.entrySet()) {
            template = template.replace("$" + x.getKey() + "$", x.getValue());
        }
        return template;
    }

    @Data
@ReflectionMarker
    @AllArgsConstructor
    private static class AppriseMessage {

        private String urls;
        private String body;
        @JsonInclude(JsonInclude.Include.NON_NULL)
        private String title;
        private String type;


    }

}
