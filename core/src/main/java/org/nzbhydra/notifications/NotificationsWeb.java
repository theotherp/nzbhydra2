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

import org.reflections.Reflections;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.MediaType;
import org.springframework.security.access.annotation.Secured;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@SuppressWarnings("unchecked")
@RestController
public class NotificationsWeb {

    @Autowired
    private NotificationRepository notificationRepository;
    @Autowired
    private ApplicationEventPublisher applicationEventPublisher;

    private static final Logger logger = LoggerFactory.getLogger(NotificationsWeb.class);


    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/notifications", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    @Transactional
    public List<NotificationEntity> getUnreadNotifications() {
        return notificationRepository.findAllByDisplayedFalseOrderByTimeDesc();
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/notifications/markRead/{id}", method = RequestMethod.PUT)
    @Transactional
    public void sendIndexerDisabledNotification(@PathVariable("id") int id) {
        final Optional<NotificationEntity> byId = notificationRepository.findById(id);
        if (!byId.isPresent()) {
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

        Reflections reflections = new Reflections("org.nzbhydra.notifications");
        Set<Class<? extends NotificationEvent>> notificationEventClasses = reflections.getSubTypesOf(NotificationEvent.class);
        final Optional<? extends NotificationEvent> notificationEvent = notificationEventClasses.stream()
                .map(x -> {
                    try {
                        return x.newInstance();
                    } catch (InstantiationException | IllegalAccessException e) {
                        logger.error("Unable to instantiate event for {}", eventType, e);
                        return null;
                    }
                })
                .filter(x -> x != null && x.getEventType() == notificationEventType)
                .findFirst();
        if (!notificationEvent.isPresent()) {
            throw new RuntimeException("Unable to create test notification for event type " + eventType);
        }
        logger.info("Sending test notification for type {}", eventType);
        applicationEventPublisher.publishEvent(notificationEvent.get().getTestInstance());
    }


}
