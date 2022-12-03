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

package org.nzbhydra.database;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.sql.Connection;
import java.sql.SQLException;

@Configuration
public class FlywayMigration {

    private static final Logger logger = LoggerFactory.getLogger(FlywayMigration.class);


    @Bean
    public FlywayMigrationStrategy flywayMigrationStrategy() {
        return new FlywayMigrationStrategy() {
            @Override
            public void migrate(Flyway flyway) {
                try {
                    flyway.migrate();
                } catch (FlywayException e) {
                    if (e.getMessage().contains("1.15")) {
                        logger.info("Found failed database migration. Attempting repair");
                        flyway.repair();
                        try {
                            try (Connection connection = flyway.getConfiguration().getDataSource().getConnection()) {
                                connection.createStatement().executeUpdate("delete from PUBLIC.\"schema_version\" where \"version\" = '1.15' or \"version\" = '1.16'");
                            }
                        } catch (SQLException e1) {
                            logger.error("Error while deleting old migration steps", e);
                        }
                        flyway.migrate();
                    } else if (e.getMessage().contains("1.21")) {
                        logger.info("Found failed database migration. Attempting repair");
                        flyway.repair();
                        try {
                            try (Connection connection = flyway.getConfiguration().getDataSource().getConnection()) {
                                connection.createStatement().execute("delete from PUBLIC.\"schema_version\" where \"version\" = '1.15' or \"version\" = '1.16'");
                                connection.createStatement().executeUpdate("delete from PUBLIC.\"schema_version\" where \"version\" = '1.15' or \"version\" = '1.16'");
                            }
                        } catch (SQLException e1) {
                            logger.error("Error while deleting old migration steps", e);
                        }
                        flyway.migrate();
                    } else if (e.getMessage().contains("Applied to database : 182559665")) {
                        //Script had to be changed because with update to SB 2.2 and Flyway 6.0 a comment using // was not properly read in the file V1.0__INITIAL.sql
                        logger.debug("Reparing changed initial migration SQL checksum");
//                        flyway.repair();
                        try {
                            try (Connection connection = flyway.getConfiguration().getDataSource().getConnection()) {
                                connection.createStatement().execute("update \"schema_version\" x set x.\"checksum\" = 1776042577 where x.\"script\" = 'V1.0__INITIAL.sql'");
                            }
                        } catch (SQLException e1) {
                            logger.error("Error while changing initial migration SQL checksum", e);
                        }
                        flyway.migrate();
                    } else {
                        throw new RuntimeException("Error while migrating database", e);
                    }
                }
            }
        };
    }
}
