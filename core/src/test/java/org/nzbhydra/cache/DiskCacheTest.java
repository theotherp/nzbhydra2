

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
        DiskCache diskCache = new DiskCache(file, "name");
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
        DiskCache diskCache = new DiskCache(file, "name");
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
        DiskCache diskCache = new DiskCache(file, "name");
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