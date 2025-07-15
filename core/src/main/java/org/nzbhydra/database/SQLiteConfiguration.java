/*
 *  (C) Copyright 2024 TheOtherP (theotherp@posteo.net)
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

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;

/**
 * SQLite configuration for proper multithreading support.
 * SQLite has file-level locking, so we need to configure connection pooling carefully.
 */
@Configuration
public class SQLiteConfiguration {

    private static final Logger logger = LoggerFactory.getLogger(SQLiteConfiguration.class);

    @Value("${spring.datasource.url}")
    private String databaseUrl;

    @Value("${spring.datasource.driver-class-name}")
    private String driverClassName;

    @Bean
    @Primary
    public DataSource dataSource() {
        logger.info("Configuring SQLite data source with URL: {}", databaseUrl);

        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(databaseUrl);
        config.setDriverClassName(driverClassName);

        // SQLite-specific connection pooling settings for multithreading
        // SQLite has file-level locking, but we need more connections for concurrent reads
        config.setMaximumPoolSize(5);
        config.setMinimumIdle(2);
        config.setConnectionTimeout(60000);
        config.setIdleTimeout(300000);
        config.setMaxLifetime(900000);
        config.setLeakDetectionThreshold(30000);
        config.setConnectionTestQuery("SELECT 1");

        // Additional SQLite-specific settings
        config.addDataSourceProperty("cache", "shared");
        config.addDataSourceProperty("mode", "memory");
        config.addDataSourceProperty("cache_size", "10000");
        config.addDataSourceProperty("synchronous", "NORMAL");
        config.addDataSourceProperty("journal_mode", "WAL");
        config.addDataSourceProperty("temp_store", "MEMORY");
        config.addDataSourceProperty("mmap_size", "268435456");
        config.addDataSourceProperty("page_size", "4096");
        config.addDataSourceProperty("max_page_count", "1073741824");

        HikariDataSource dataSource = new HikariDataSource(config);

        logger.info("SQLite data source configured successfully");
        return dataSource;
    }
} 