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

package org.nzbhydra.problemdetection;

import joptsimple.internal.Strings;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.genericstorage.GenericStorage;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.notifications.IndexerVipExpiryNotificationEvent;
import org.nzbhydra.springnative.ReflectionMarker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import java.io.Serializable;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
@Component
public class VipExpiryDetector implements ProblemDetector {

    private static final String KEY = "VIP_EXPIRY";

    private enum State {
        LOOKING_FOR_OOM,
        FOUND_OOM,
        LOOKING_FOR_OOM_END
    }

    private static final Logger logger = LoggerFactory.getLogger(VipExpiryDetector.class);

    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private GenericStorage genericStorage;
    @Autowired
    private ApplicationEventPublisher applicationEventPublisher;

    @Override
    public void executeCheck() {
        final List<IndexerConfig> indexersSoonExpiring = configProvider.getBaseConfig().getIndexers().stream()
            .filter(x -> !Strings.isNullOrEmpty(x.getVipExpirationDate()) && !x.getVipExpirationDate().equals("Lifetime"))
            .filter(x -> {
                try {
                    final LocalDate expiryDate = LocalDate.parse(x.getVipExpirationDate(), DateTimeFormatter.ofPattern("yyyy-MM-dd"));
                    return expiryDate.isBefore(LocalDate.now().plusDays(14)) && expiryDate.isAfter(LocalDate.now());
                } catch (Exception e) {
                    logger.error("Unable to parse expiry date {}", x.getVipExpirationDate(), e);
                    return false;
                }
            })
            .toList();

        logger.debug(LoggingMarkers.VIP_EXPIRY, "Found indexers with VIP expiry data in the next 14 days: {}", indexersSoonExpiring.stream().map(x -> x.getName() + ": " + x.getVipExpirationDate()).collect(Collectors.joining(", ")));

        final VipExpiryData vipExpiryData = genericStorage.get(KEY, VipExpiryData.class).orElse(new VipExpiryData());

        for (IndexerConfig indexerConfig : indexersSoonExpiring) {
            VipExpiryDataEntry toCheck = new VipExpiryDataEntry(indexerConfig.getName(), indexerConfig.getVipExpirationDate());
            final Optional<VipExpiryDataEntry> alreadyReported = vipExpiryData.entries.stream()
                    .filter(x -> x.equals(toCheck))
                    .findFirst();
            if (alreadyReported.isPresent()) {
                logger.debug(LoggingMarkers.VIP_EXPIRY, "Already notified of {}", alreadyReported.get());
                continue;
            }
            logger.warn("VIP access for {} will expire at {}", indexerConfig.getName(), indexerConfig.getVipExpirationDate());
            applicationEventPublisher.publishEvent(new IndexerVipExpiryNotificationEvent(indexerConfig.getName(), indexerConfig.getVipExpirationDate()));
            vipExpiryData.entries.add(new VipExpiryDataEntry(indexerConfig.getName(), indexerConfig.getVipExpirationDate()));
            genericStorage.save(KEY, vipExpiryData);
        }
    }

    @Data
    @ReflectionMarker
    @NoArgsConstructor
    private static class VipExpiryData implements Serializable {

        private final List<VipExpiryDataEntry> entries = new ArrayList<>();

    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    @EqualsAndHashCode
    @ToString
    @ReflectionMarker
    private static class VipExpiryDataEntry implements Serializable {

        private String indexerName;
        private String expiryDate;

    }

}
