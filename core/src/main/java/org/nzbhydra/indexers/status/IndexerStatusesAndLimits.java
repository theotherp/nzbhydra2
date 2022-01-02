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

package org.nzbhydra.indexers.status;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.searching.SearchModuleProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import javax.persistence.EntityManager;
import javax.persistence.Query;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoField;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class IndexerStatusesAndLimits {

    private static final Logger logger = LoggerFactory.getLogger(IndexerStatusesAndLimits.class);

    private static final DateTimeFormatter DATE_PATTERN = DateTimeFormatter.ofPattern("dd.MM.yyyy-HH:mm:ss:SSS");
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private EntityManager entityManager;
    @Autowired
    private IndexerLimitRepository indexerLimitRepository;
    @Autowired
    private SearchModuleProvider searchModuleProvider;

    public List<IndexerStatus> getSortedStatuses() {
        return configProvider.getBaseConfig().getIndexers().stream()
                .sorted(
                        Comparator.comparing(IndexerConfig::getState)
                                .thenComparing(o -> o.getName().toLowerCase())
                )
                .map(
                        this::getIndexerStatus
                )
                .collect(Collectors.toList());
    }

    private IndexerStatus getIndexerStatus(IndexerConfig x) {

        IndexerStatus indexerStatus = new IndexerStatus();
        indexerStatus.setIndexer(x.getName());
        indexerStatus.setState(x.getState().name());
        indexerStatus.setLevel(x.getDisabledLevel());
        indexerStatus.setDisabledUntil(x.getDisabledUntil() == null ? null : Instant.ofEpochMilli(x.getDisabledUntil()));
        indexerStatus.setVipExpirationDate(x.getVipExpirationDate());
        indexerStatus.setLastError(x.getLastError());

        setLimitRelatedValues(x, indexerStatus);

        //Set after retrieving values from the db so that configured by the user are used, trumping those from the database
        x.getHitLimit().ifPresent(indexerStatus::setApiHitLimit);
        x.getDownloadLimit().ifPresent(indexerStatus::setDownloadHitLimit);

        return indexerStatus;
    }

    private void setLimitRelatedValues(IndexerConfig x, IndexerStatus indexerStatus) {
        IndexerEntity indexerEntity = searchModuleProvider.getIndexerByName(x.getName()).getIndexerEntity();
        IndexerLimit limitEntity = indexerLimitRepository.findByIndexer(indexerEntity);
        if (limitEntity.getApiHitLimit() != null) {
            indexerStatus.setApiHitLimit(limitEntity.getApiHitLimit());
        }
        if (limitEntity.getDownloadLimit() != null) {
            indexerStatus.setDownloadHitLimit(limitEntity.getDownloadLimit());
        }
        if (limitEntity.getApiHits() != null) {
            indexerStatus.setApiHits(limitEntity.getApiHits());
            indexerStatus.setDownloadHits(limitEntity.getDownloads());
        } else {
            setFromApiShortTermStorage(x, indexerStatus, indexerEntity);
        }
    }

    private void setFromApiShortTermStorage(IndexerConfig x, IndexerStatus indexerStatus, IndexerEntity indexerEntity) {
        LimitsRetrieval limitsRetrieval = new LimitsRetrieval(x, indexerEntity).invoke();
        int countApiHits = limitsRetrieval.getCountApiHits();
        int countDownloads = limitsRetrieval.getCountDownloads();
        Instant earliestApiHit = limitsRetrieval.getEarliestApiHit();
        Instant earliestDownload = limitsRetrieval.getEarliestDownload();

        indexerStatus.setApiHits(countApiHits);
        //Set reset time for API limits
        if (x.getHitLimit().isPresent() && countApiHits >= x.getHitLimit().get()) {
            if (x.getHitLimitResetTime().isPresent()) {
                //Fixed time
                Instant nextResetTime = getResetTime(x);
                indexerStatus.setApiResetTime(nextResetTime);
            } else {
                //Rolling window
                indexerStatus.setApiResetTime(earliestApiHit.plus(1, ChronoUnit.DAYS));
            }
        }

        indexerStatus.setDownloadHits(countDownloads);
        //Set reset time for downloads
        if (x.getDownloadLimit().isPresent() && countDownloads >= x.getDownloadLimit().get()) {
            if (x.getHitLimitResetTime().isPresent()) {
                //FIxed time
                Instant nextResetTime = getResetTime(x);
                indexerStatus.setDownloadResetTime(nextResetTime);
            } else {
                //Rolling window
                indexerStatus.setDownloadResetTime(earliestDownload.plus(1, ChronoUnit.DAYS));
            }
        }
        logger.debug(LoggingMarkers.LIMITS, "Indexer {}. Saving from API shot term storage: {}", x.getName(), indexerStatus);
    }


    private Instant getResetTime(IndexerConfig indexerConfig) {
        if (!indexerConfig.getHitLimitResetTime().isPresent()) {
            return null;
        }
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        LocalDateTime nextPossibleHit = now.truncatedTo(ChronoUnit.DAYS).with(ChronoField.HOUR_OF_DAY, indexerConfig.getHitLimitResetTime().get());
        if (nextPossibleHit.isBefore(now)) {
            nextPossibleHit = nextPossibleHit.plus(1, ChronoUnit.DAYS);
        }
        return nextPossibleHit.toInstant(ZoneOffset.UTC);
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class IndexerStatus {
        private String indexer;
        private String state;
        private int level;
        private Instant disabledUntil;
        private String lastError;
        private Instant apiResetTime;
        private Instant downloadResetTime;
        private Integer apiHits;
        private Integer apiHitLimit;
        private Integer downloadHits;
        private Integer downloadHitLimit;
        private String vipExpirationDate;

    }

    private class LimitsRetrieval {
        private final IndexerConfig indexerConfig;
        private final IndexerEntity indexerEntity;
        private int countApiHits;
        private int countDownloads;
        private Instant earliestApiHit;
        private Instant earliestDownload;

        public LimitsRetrieval(IndexerConfig indexerConfig, IndexerEntity indexerEntity) {
            this.indexerConfig = indexerConfig;
            this.indexerEntity = indexerEntity;
        }

        public int getCountApiHits() {
            return countApiHits;
        }

        public int getCountDownloads() {
            return countDownloads;
        }

        public Instant getEarliestApiHit() {
            return earliestApiHit;
        }

        public Instant getEarliestDownload() {
            return earliestDownload;
        }

        public LimitsRetrieval invoke() {
            String sqlString = "SELECT * FROM INDEXERAPIACCESS_SHORT x WHERE x.INDEXER_ID = :indexerId";
            if (indexerConfig.getHitLimitResetTime().isPresent()) {
                //Fixed point in time where API resets
                LocalDateTime lastResetTime = LocalDateTime.now(Clock.systemUTC()).truncatedTo(ChronoUnit.HOURS).with(ChronoField.HOUR_OF_DAY, indexerConfig.getHitLimitResetTime().get());
                if (lastResetTime.isAfter(LocalDateTime.now(Clock.systemUTC()))) {
                    lastResetTime = lastResetTime.minus(1, ChronoUnit.DAYS);
                }
                sqlString += " AND x.time > PARSEDATETIME('" + DATE_PATTERN.format(lastResetTime) + "', 'dd.MM.yyyy-HH:mm:ss:SSS')";
            } else {
                //Rolling window, last 24 hours count
                sqlString += " AND x.TIME > DATEADD('HOUR', -24, CURRENT_TIMESTAMP())";
            }
            sqlString += " ORDER BY TIME ASC";
            Query query = entityManager.createNativeQuery(sqlString);
            query.setParameter("indexerId", indexerEntity.getId());

            List resultList = query.getResultList();
            countApiHits = 0;
            countDownloads = 0;
            earliestApiHit = null;
            earliestDownload = null;
            for (Object o : resultList) {
                Object[] array = ((Object[]) o);
                if ("NZB".equals(array[4])) {
                    countDownloads += 1;
                    if (earliestDownload == null) {
                        earliestDownload = ((Timestamp) array[2]).toInstant();
                    }
                } else {
                    countApiHits += 1;
                    if (earliestApiHit == null) {
                        earliestApiHit = ((Timestamp) array[2]).toInstant();
                    }
                }
            }
            logger.debug(LoggingMarkers.LIMITS, "Indexer {}. Found result in database: {}", indexerEntity.getName(), this);
            return this;
        }
    }
}
