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

package org.nzbhydra.cache;

import lombok.SneakyThrows;
import org.apache.commons.io.FileUtils;
import org.apache.commons.lang3.RandomStringUtils;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

import static org.assertj.core.api.Assertions.assertThat;

@Disabled
class DiskCacheTest {

    File file;

    @BeforeEach
    @SneakyThrows
    public void setUp() {
        file = Files.createTempDirectory("test").toFile();
    }

    @AfterEach
    @SneakyThrows
    public void tearDown() {
        if (file != null) {
            FileUtils.deleteQuietly(file);
        }
    }

    @Test
    @SneakyThrows
    public void shouldSaveAndLoad() {
        DiskCache diskCache = new DiskCache(file);
        assertThat(diskCache.lookup("doesntExistYet")).isNull();
        assertThat(diskCache.get("doesntExistYet")).isNull();

        byte[] value = "hello".getBytes(StandardCharsets.UTF_8);

        diskCache.put("key", value);
        assertThat(diskCache.get("key").get()).isEqualTo(value);
        assertThat(file.listFiles()).isNotEmpty();

        diskCache.evict("key");
        assertThat(file.listFiles()).isEmpty();

    }

    @Test
    @SneakyThrows
    public void shouldCleanWhenTooMany() {
        DiskCache diskCache = new DiskCache(file);
        for (int i = 1; i <= 501; i++) {
            byte[] value = "hello".getBytes(StandardCharsets.UTF_8);
            diskCache.put("key" + i, value);
        }
        assertThat(diskCache.get("key1"))
                .as("Should've deleted oldest entry")
                .isNull();

        assertThat(diskCache.get("key2"))
                .as("Should've kept second oldest entry")
                .isNotNull();
    }

    @Test
    @SneakyThrows
    public void shouldCleanWhenTooLarge() {
        DiskCache diskCache = new DiskCache(file);
        for (int i = 1; i <= 3; i++) {
            String value = RandomStringUtils.random(10_000_000);
            diskCache.put("key" + i, value.getBytes(StandardCharsets.UTF_8));
        }
        assertThat(diskCache.get("key1"))
                .as("Should've deleted oldest entry")
                .isNull();

        assertThat(diskCache.get("key2"))
                .as("Should've kept second oldest entry")
                .isNotNull();
    }
}