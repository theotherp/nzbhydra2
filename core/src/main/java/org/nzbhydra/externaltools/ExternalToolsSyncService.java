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

package org.nzbhydra.externaltools;

import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.ExternalToolConfig;
import org.nzbhydra.config.ExternalToolsConfig;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.notifications.NotificationEntity;
import org.nzbhydra.notifications.NotificationMessageType;
import org.nzbhydra.notifications.NotificationRepository;
import org.nzbhydra.web.UrlCalculator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Component
public class ExternalToolsSyncService {

    private static final Logger logger = LoggerFactory.getLogger(ExternalToolsSyncService.class);

    @Autowired
    private ExternalTools externalTools;
    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private UrlCalculator urlCalculator;
    @Autowired
    private NotificationRepository notificationRepository;

    /**
     * Sync all indexers to all configured external tools
     *
     * @return Summary of sync results
     */
    public SyncResult syncAllTools() {
        return syncTools(null);
    }

    /**
     * Sync specific indexers to all configured external tools
     *
     * @param changedIndexers Set of indexer names that were changed, or null to sync all
     * @return Summary of sync results
     */
    public SyncResult syncTools(Set<String> changedIndexers) {
        ExternalToolsConfig config = configProvider.getBaseConfig().getExternalTools();
        if (!config.isSyncOnConfigChange()) {
            logger.debug("External tools sync is disabled");
            return new SyncResult(0, 0, new ArrayList<>());
        }

        List<ExternalToolConfig> enabledTools = config.getExternalTools().stream()
                .filter(ExternalToolConfig::isEnabled)
                .toList();

        if (enabledTools.isEmpty()) {
            logger.debug("No enabled external tools configured");
            return new SyncResult(0, 0, new ArrayList<>());
        }

        logger.info("Starting sync to {} external tools", enabledTools.size());

        int successCount = 0;
        int failureCount = 0;
        List<String> messages = new ArrayList<>();

        for (ExternalToolConfig tool : enabledTools) {
            try {
                boolean success = syncToTool(tool, changedIndexers);
                if (success) {
                    successCount++;
                    messages.add("Successfully synced to " + tool.getName());
                } else {
                    failureCount++;
                    messages.addAll(externalTools.getMessages());
                }
            } catch (Exception e) {
                failureCount++;
                logger.error("Failed to sync to {}: {}", tool.getName(), e.getMessage(), e);
                messages.add("Failed to sync to " + tool.getName() + ": " + e.getMessage());
            }
        }

        // Create notification
        createNotification(successCount, failureCount, messages);

        return new SyncResult(successCount, failureCount, messages);
    }

    private boolean syncToTool(ExternalToolConfig tool, Set<String> changedIndexers) throws IOException {
        logger.info("Syncing to {} ({})", tool.getName(), tool.getType());

        // Convert tool config to AddRequest
        AddRequest request = buildAddRequest(tool, changedIndexers);

        // Use existing ExternalTools logic
        boolean success = externalTools.addNzbhydraAsIndexer(request);

        if (success) {
            logger.info("Successfully synced to {}", tool.getName());
        } else {
            logger.warn("Failed to sync to {}", tool.getName());
        }

        return success;
    }

    private AddRequest buildAddRequest(ExternalToolConfig tool, Set<String> changedIndexers) {
        AddRequest request = new AddRequest();

        // Map tool type to ExternalTool enum
        AddRequest.ExternalTool externalToolType = switch (tool.getType()) {
            case SONARR -> AddRequest.ExternalTool.Sonarr;
            case RADARR -> AddRequest.ExternalTool.Radarr;
            case LIDARR -> AddRequest.ExternalTool.Lidarr;
            case READARR -> AddRequest.ExternalTool.Readarr;
        };
        request.setExternalTool(externalToolType);

        // Set connection details
        request.setXdarrHost(tool.getHost());
        request.setXdarrApiKey(tool.getApiKey());
        request.setNzbhydraHost(urlCalculator.getRequestBasedUriBuilder().build().toUriString());
        request.setNzbhydraName(tool.getNzbhydraName());

        // Set sync type
        AddRequest.AddType addType = tool.getSyncType() == ExternalToolConfig.SyncType.SINGLE
                ? AddRequest.AddType.SINGLE
                : AddRequest.AddType.PER_INDEXER;
        request.setAddType(addType);

        // If we're in PER_INDEXER mode and have changed indexers, only sync those
        if (addType == AddRequest.AddType.PER_INDEXER && changedIndexers != null && !changedIndexers.isEmpty()) {
            // This will be handled by the ExternalTools class by filtering indexers
            request.setAdditionalParameters("indexers=" + String.join(",", changedIndexers));
        }

        // Set configuration options
        request.setConfigureForUsenet(tool.isConfigureForUsenet());
        request.setConfigureForTorrents(tool.isConfigureForTorrents());
        request.setAddDisabledIndexers(tool.isAddDisabledIndexers());
        request.setUseHydraPriorities(tool.isUseHydraPriorities());
        request.setPriority(tool.getPriority());

        // Set RSS and search settings
        request.setEnableRss(tool.isEnableRss());
        request.setEnableAutomaticSearch(tool.isEnableAutomaticSearch());
        request.setEnableInteractiveSearch(tool.isEnableInteractiveSearch());

        // Set categories
        request.setCategories(tool.getCategories());
        request.setAnimeCategories(tool.getAnimeCategories());

        // Set additional settings
        request.setAdditionalParameters(tool.getAdditionalParameters());
        request.setMinimumSeeders(tool.getMinimumSeeders());
        request.setSeedRatio(tool.getSeedRatio());
        request.setSeedTime(tool.getSeedTime());
        request.setSeasonPackSeedTime(tool.getSeasonPackSeedTime());
        request.setDiscographySeedTime(tool.getDiscographySeedTime());
        request.setEarlyDownloadLimit(tool.getEarlyDownloadLimit());
        request.setRemoveYearFromSearchString(tool.isRemoveYearFromSearchString());

        return request;
    }

    private void createNotification(int successCount, int failureCount, List<String> messages) {
        String title = "External Tools Sync";
        String body;

        if (failureCount == 0 && successCount > 0) {
            body = String.format("Successfully synced to %d external tool(s)", successCount);
        } else if (successCount == 0 && failureCount > 0) {
            body = String.format("Failed to sync to %d external tool(s). Check logs for details.", failureCount);
        } else {
            body = String.format("Synced to %d tool(s), %d failed. Check logs for details.", successCount, failureCount);
        }

        NotificationEntity notification = new NotificationEntity();
        notification.setTime(Instant.now());
        notification.setTitle(title);
        notification.setBody(body);
        notification.setUrls(null);
        notification.setDisplayed(false);
        notification.setMessageType(failureCount > 0
                ? NotificationMessageType.FAILURE
                : NotificationMessageType.SUCCESS);

        notificationRepository.save(notification);
    }

    public static class SyncResult {
        private final int successCount;
        private final int failureCount;
        private final List<String> messages;

        public SyncResult(int successCount, int failureCount, List<String> messages) {
            this.successCount = successCount;
            this.failureCount = failureCount;
            this.messages = messages;
        }

        public int getSuccessCount() {
            return successCount;
        }

        public int getFailureCount() {
            return failureCount;
        }

        public List<String> getMessages() {
            return messages;
        }
    }

    /**
     * Detect which indexers have changed between old and new config
     */
    public Set<String> detectChangedIndexers(List<IndexerConfig> oldIndexers, List<IndexerConfig> newIndexers) {
        Set<String> changed = new HashSet<>();

        // Check for added or modified indexers
        for (IndexerConfig newIndexer : newIndexers) {
            IndexerConfig oldIndexer = oldIndexers.stream()
                    .filter(i -> i.getName().equals(newIndexer.getName()))
                    .findFirst()
                    .orElse(null);

            if (oldIndexer == null) {
                // New indexer
                changed.add(newIndexer.getName());
            } else if (!IndexerConfig.isIndexerEquals(oldIndexer, newIndexer)) {
                // Modified indexer
                changed.add(newIndexer.getName());
            }
        }

        // Check for removed indexers
        for (IndexerConfig oldIndexer : oldIndexers) {
            boolean exists = newIndexers.stream()
                    .anyMatch(i -> i.getName().equals(oldIndexer.getName()));
            if (!exists) {
                changed.add(oldIndexer.getName());
            }
        }

        return changed;
    }
}