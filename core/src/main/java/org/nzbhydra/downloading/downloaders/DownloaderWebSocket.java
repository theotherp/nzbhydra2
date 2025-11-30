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

package org.nzbhydra.downloading.downloaders;

import jakarta.annotation.PreDestroy;
import org.nzbhydra.ShutdownEvent;
import org.nzbhydra.config.ConfigChangedEvent;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.logging.LoggingMarkers;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Controller;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

@Controller
public class DownloaderWebSocket {
    private static final Logger logger = LoggerFactory.getLogger(DownloaderWebSocket.class);
    private static final int INTERVAL = 1000;
    private static final String TOPIC = "/topic/downloaderStatus";

    @Autowired
    private ConfigProvider configProvider;

    @Autowired
    private DownloaderStatusRetrieval downloaderStatusRetrieval;

    @Autowired
    private SimpMessageSendingOperations messagingTemplate;

    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();

    private ScheduledFuture<?> scheduledFuture;

    private volatile DownloaderStatus lastSentStatus;

    // Use thread-safe set since subscribe/disconnect events can come from different threads
    private final Set<String> connectedSessionIds = ConcurrentHashMap.newKeySet();

    // Lock for synchronizing scheduler operations
    private final Object schedulerLock = new Object();


    @MessageMapping("/connectDownloaderStatus")
    @SendTo(TOPIC)
    public DownloaderStatus connect() {
        return lastSentStatus;
    }

    private void scheduleDownloadStatusSending() {
        scheduledFuture = scheduler.scheduleAtFixedRate(() -> {
            final DownloaderStatus newStatus = downloaderStatusRetrieval.getStatus();
            if (newStatus.getState() == DownloaderStatus.State.DOWNLOADING) {
                //Always send updates when downloading
                logger.debug(LoggingMarkers.DOWNLOADER_STATUS_UPDATE, "Sending new downloading status data. Status: {}. In queue: {}. Remaining time: {}. Download rate: {}", newStatus.getState(), newStatus.getElementsInQueue(), newStatus.getRemainingTimeFormatted(), newStatus.getDownloadRateFormatted());
                messagingTemplate.convertAndSend("/topic/downloaderStatus", newStatus);
                lastSentStatus = newStatus;
            } else if (!newStatus.equals(lastSentStatus)) {
                //Send update because data has changed
                logger.debug(LoggingMarkers.DOWNLOADER_STATUS_UPDATE, "Sending new status data because it's different from the last sent. Status: {}. In queue: {}. Remaining time: {}. Download rate: {}", newStatus.getState(), newStatus.getElementsInQueue(), newStatus.getRemainingTimeFormatted(), newStatus.getDownloadRateFormatted());
                messagingTemplate.convertAndSend("/topic/downloaderStatus", newStatus);
                lastSentStatus = newStatus;
            } else if (!lastSentStatus.isLastUpdateForNow()) {
                //Same data as before and we haven't nofified the backend yet that we'll send no further data for now
                logger.debug(LoggingMarkers.DOWNLOADER_STATUS_UPDATE, "New status data is the same as the old. Informing the frontend this is the last update for now. Status: {}. In queue: {}. Remaining time: {}. Download rate: {}", newStatus.getState(), newStatus.getElementsInQueue(), newStatus.getRemainingTimeFormatted(), newStatus.getDownloadRateFormatted());
                newStatus.setLastUpdateForNow(true);
                messagingTemplate.convertAndSend("/topic/downloaderStatus", newStatus);
                lastSentStatus = newStatus;
            }

        }, 0, INTERVAL, TimeUnit.MILLISECONDS);
    }

    @EventListener
    public void onClientSubscribe(SessionSubscribeEvent event) {
        final String simpDestination = (String) event.getMessage().getHeaders().get("simpDestination");
        if (TOPIC.equals(simpDestination)) {
            final String simpSessionId = (String) event.getMessage().getHeaders().get("simpSessionId");
            logger.debug(LoggingMarkers.DOWNLOADER_STATUS_UPDATE, "Registered new connection with session ID {}", simpSessionId);

            synchronized (schedulerLock) {
                boolean wasEmpty = connectedSessionIds.isEmpty();
                connectedSessionIds.add(simpSessionId);
                if (wasEmpty && scheduledFuture == null) {
                    logger.debug(LoggingMarkers.DOWNLOADER_STATUS_UPDATE, "Scheduling downloader status update {}", simpSessionId);
                    scheduleDownloadStatusSending();
                }
            }
        }
    }

    @EventListener
    public void onClientDisconnect(SessionDisconnectEvent event) {
        final String simpSessionId = (String) event.getMessage().getHeaders().get("simpSessionId");
        synchronized (schedulerLock) {
            if (connectedSessionIds.remove(simpSessionId)) {
                logger.debug(LoggingMarkers.DOWNLOADER_STATUS_UPDATE, "Registered disconnect with session ID {}", simpSessionId);
                if (connectedSessionIds.isEmpty()) {
                    if (scheduledFuture != null) {
                        logger.debug(LoggingMarkers.DOWNLOADER_STATUS_UPDATE, "Cancelling update schedule because no connections left");
                        scheduledFuture.cancel(true);
                        scheduledFuture = null;
                    } else {
                        logger.debug(LoggingMarkers.DOWNLOADER_STATUS_UPDATE, "No connections found but update was also not scheduled");
                    }
                } else {
                    logger.debug(LoggingMarkers.DOWNLOADER_STATUS_UPDATE, "Not cancelling schedule because still connections left");
                }
            }
        }
    }


    @EventListener
    public void handleNewConfig(ConfigChangedEvent configChangedEvent) {
        synchronized (schedulerLock) {
            if (scheduledFuture != null && !configChangedEvent.getNewConfig().getDownloading().isShowDownloaderStatus()) {
                scheduledFuture.cancel(true);
                scheduledFuture = null;
            } else if (scheduledFuture == null && configChangedEvent.getNewConfig().getDownloading().isShowDownloaderStatus() && !connectedSessionIds.isEmpty()) {
                scheduleDownloadStatusSending();
            }
        }
    }

    @EventListener
    public void handleShutdown(ShutdownEvent shutdownEvent) {
        onShutdown();
    }

    @PreDestroy
    public void onShutdown() {
        synchronized (schedulerLock) {
            if (scheduledFuture != null) {
                scheduledFuture.cancel(true);
                scheduledFuture = null;
            }
        }
        scheduler.shutdown();
    }


}
