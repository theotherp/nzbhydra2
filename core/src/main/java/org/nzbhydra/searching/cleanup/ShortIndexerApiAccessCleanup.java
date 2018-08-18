/*
 *  (C) Copyright 2017 TheOtherP (theotherp@gmx.de)
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

package org.nzbhydra.searching.cleanup;

import org.nzbhydra.indexers.IndexerApiAccessEntityShortRepository;
import org.nzbhydra.tasks.HydraTask;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
public class ShortIndexerApiAccessCleanup {

    @Autowired
    private IndexerApiAccessEntityShortRepository repository;

    private static final Logger logger = LoggerFactory.getLogger(ShortIndexerApiAccessCleanup.class);

    private static final long TWELVE_HOURS = 1000 * 60 * 60 * 12;

    @HydraTask(configId = "deletShortTermStorageResults", name = "Delete short term storage results", interval = TWELVE_HOURS)
    @Transactional
    public void deleteOldResults() {
        int deletedResults = repository.deleteByTimeBefore(Instant.now().minus(2, ChronoUnit.DAYS));
        if (deletedResults > 0) {
            logger.debug("Deleted {} indexer API accesses from short term storage", deletedResults);
        }
    }

}
