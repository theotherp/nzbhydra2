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

package org.nzbhydra.notifications;

import com.google.common.collect.Sets;
import jakarta.annotation.PreDestroy;
import org.nzbhydra.config.notification.NotificationEventType;
import org.nzbhydra.logging.LoggingMarkers;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

@RestController
public class NotificationsWeb {

    private static final Logger logger = LoggerFactory.getLogger(NotificationsWeb.class);
    private static final int INTERVAL = 1000;
    private static final String TOPIC = "/topic/notifications";
    private static final Set<NotificationEvent> NOTIFICATION_EVENTS = Sets.newHashSet(
        new DownloadNotificationEvent(),
        new IndexerDisabledNotificationEvent(),
        new UpdateNotificationEvent(),
        new DownloadCompletionNotificationEvent(),
        new IndexerVipExpiryNotificationEvent(),
        new IndexerReenabledNotificationEvent(),
        new AuthFailureNotificationEvent()
    );

    @Autowired
    private NotificationRepository notificationRepository;
    @Autowired
    private ApplicationEventPublisher applicationEventPublisher;
    @Autowired
    private SimpMessageSendingOperations messagingTemplate;

    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
    private ScheduledFuture<?> scheduledFuture;
    private final Set<String> connectedSessionIds = new HashSet<>();

    private void scheduleDownloadStatusSending() {
        scheduledFuture = scheduler.scheduleAtFixedRate(() -> {
            final List<NotificationEntity> newNotifications = notificationRepository.findAllByDisplayedFalseOrderByTimeDesc();
            if (newNotifications.isEmpty()) {
                return;
            }
            messagingTemplate.convertAndSend(TOPIC, newNotifications);
        }, 0, INTERVAL, TimeUnit.MILLISECONDS);
    }

    @MessageMapping("/markNotificationRead")
    public void markRead(int id) {
        final Optional<NotificationEntity> byId = notificationRepository.findById(id);
        if (byId.isEmpty()) {
            logger.error("Unable to mark notification with ID {} as read because no notification with that ID was found", id);
            return;
        }
        byId.get().setDisplayed(true);
        notificationRepository.save(byId.get());
    }


    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/notifications/test/{eventType}", method = RequestMethod.GET)
    public void testNotification(@PathVariable("eventType") String eventType) {
        final NotificationEventType notificationEventType = NotificationEventType.valueOf(eventType);

        final Optional<? extends NotificationEvent> notificationEvent = NOTIFICATION_EVENTS
            .stream()
            .filter(x -> x != null && x.getEventType() == notificationEventType)
            .findFirst();
        if (notificationEvent.isEmpty()) {
            throw new RuntimeException("Unable to create test notification for event type " + eventType);
        }
        logger.info("Sending test notification for type {}", eventType);
        applicationEventPublisher.publishEvent(notificationEvent.get().getTestInstance());
    }

    @EventListener
    public void onClientSubscribe(SessionSubscribeEvent event) {
        final String simpDestination = (String) event.getMessage().getHeaders().get("simpDestination");
        if (TOPIC.equals(simpDestination)) {
            final String simpSessionId = (String) event.getMessage().getHeaders().get("simpSessionId");
            logger.debug(LoggingMarkers.NOTIFICATIONS, "Registered new connection with session ID {}", simpSessionId);

            if (connectedSessionIds.isEmpty()) {
                logger.debug(LoggingMarkers.NOTIFICATIONS, "Scheduling notification update {}", simpSessionId);
                scheduleDownloadStatusSending();
            }

            connectedSessionIds.add(simpSessionId);
        }
    }


    @EventListener
    public void onClientDisconnect(SessionDisconnectEvent event) {
        final String simpSessionId = (String) event.getMessage().getHeaders().get("simpSessionId");
        if (connectedSessionIds.contains(simpSessionId)) {
            logger.debug(LoggingMarkers.NOTIFICATIONS, "Registered disconnect with session ID {}", simpSessionId);
            connectedSessionIds.remove(simpSessionId);
            if (connectedSessionIds.isEmpty()) {
                if (scheduledFuture != null) {
                    logger.debug(LoggingMarkers.NOTIFICATIONS, "Cancelling update schedule because no connections left");
                    scheduledFuture.cancel(true);
                    scheduledFuture = null;
                } else {
                    logger.debug(LoggingMarkers.NOTIFICATIONS, "No connections found but notifications update was also not scheduled");
                }
            } else {
                logger.debug(LoggingMarkers.NOTIFICATIONS, "Not cancelling schedule because still connections left");
            }
        }
    }

    @PreDestroy
    public void onShutdown() {
        if (scheduledFuture != null) {
            scheduledFuture.cancel(true);
            scheduledFuture = null;
        }
        scheduler.shutdown();
    }


}
