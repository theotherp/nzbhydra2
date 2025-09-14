/*
 *  (C) Copyright 2025 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.database;

import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.FileUtils;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.ConfigProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.io.File;

@Component
@Slf4j
public class DatabaseCompactOnShutdown {


    @Autowired
    private JdbcTemplate jdbcTemplate;
    @Autowired
    private ConfigProvider configProvider;

    @PreDestroy
    public void compactOnShutdown() {
        try {
            File databaseFile = new File(NzbHydra.getDataFolder(), "database/nzbhydra.mv.db");
            log.info("Compacting database on shutdown, using up to {}ms. Size before: {}", configProvider.getBaseConfig().getMain().getDatabaseCompactTime(), FileUtils.byteCountToDisplaySize(FileUtils.sizeOf(databaseFile)));
            jdbcTemplate.execute("SHUTDOWN COMPACT");
            log.info("H2 database compacted successfully on shutdown. File after: {}", FileUtils.byteCountToDisplaySize(FileUtils.sizeOf(databaseFile)));
        } catch (Exception e) {
            log.error("Failed to compact H2 database on shutdown", e);
        }
    }
}
