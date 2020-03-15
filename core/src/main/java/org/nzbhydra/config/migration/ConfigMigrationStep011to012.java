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

package org.nzbhydra.config.migration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

@SuppressWarnings("unchecked")
public class ConfigMigrationStep011to012 implements ConfigMigrationStep {

    private static final Logger logger = LoggerFactory.getLogger(ConfigMigration.class);

    @Override
    public int forVersion() {
        return 11;
    }

    @Override
    public Map<String, Object> migrate(Map<String, Object> toMigrate) {
        Map<String, Object> searching = getFromMap(toMigrate, "searching");
        try {
            int keepSearchResultsForDays = (int) searching.get("keepSearchResultsForDays");
            if (keepSearchResultsForDays == 14) {
                logger.info("Setting keepSearchResultsForDays to 3");
                searching.put("keepSearchResultsForDays", 3);
            } else {
                logger.debug("Keeping keepSearchResultsForDays at {}", keepSearchResultsForDays);
            }
        } catch (Exception e) {
            logger.error("Error while trying to reduce keepSearchResultsForDays", e);
        }

        try {
            Map<String, Object> main = getFromMap(toMigrate, "main");
            main.put("keepHistoryForWeeks", searching.get("keepHistoryForWeeks"));
            searching.remove("keepHistoryForWeeks");
            logger.info("Moved setting keepHistoryForWeeks from searching to main");
        } catch (Exception e) {
            logger.error("Error while trying to move keepHistoryForWeeks to main config", e);
        }

        return toMigrate;
    }
}
