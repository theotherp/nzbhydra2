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

import org.nzbhydra.config.ConfigChangedEvent;
import org.nzbhydra.config.ConfigProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.stereotype.Controller;

import javax.annotation.PostConstruct;
import java.util.concurrent.ScheduledFuture;

@Controller
public class DownloaderWebSocket {
    private static final Logger logger = LoggerFactory.getLogger(DownloaderWebSocket.class);
    private static final int INTERVAL = 1000;

    @Autowired
    private ConfigProvider configProvider;

    @Autowired
    private DownloaderStatusRetrieval downloaderStatusRetrieval;

    @Autowired
    private SimpMessageSendingOperations messagingTemplate;

    @Autowired
    private ThreadPoolTaskScheduler scheduler;

    private ScheduledFuture<?> scheduledFuture;

    private DownloaderStatus lastSentStatus;

    @PostConstruct
    public void sendDownloaderStatusToWebSocket() {
        if (configProvider.getBaseConfig().getDownloading().isShowDownloaderStatus()) {
            scheduleDownloadStatusSending();
        }
    }

    @MessageMapping("/connectDownloaderStatus")
    @SendTo("/topic/downloaderStatus")
    public DownloaderStatus connect() {
        return lastSentStatus;
    }

    private void scheduleDownloadStatusSending() {
        scheduledFuture = scheduler.scheduleAtFixedRate(() -> {
            final DownloaderStatus newStatus = downloaderStatusRetrieval.getStatus();
            if (!newStatus.equals(lastSentStatus)) {
                messagingTemplate.convertAndSend("/topic/downloaderStatus", newStatus);
                lastSentStatus = newStatus;
            }
        }, INTERVAL);
    }

    @EventListener
    public void handleNewConfig(ConfigChangedEvent configChangedEvent) {
        if (scheduledFuture != null && !configChangedEvent.getNewConfig().getDownloading().isShowDownloaderStatus()) {
            scheduledFuture.cancel(true);
            scheduledFuture = null;
        } else if (scheduledFuture == null && configChangedEvent.getNewConfig().getDownloading().isShowDownloaderStatus()) {
            scheduleDownloadStatusSending();
        }

    }


}
