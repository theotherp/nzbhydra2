

package org.nzbhydra.cache;

import lombok.SneakyThrows;
import org.apache.commons.lang3.RandomStringUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.File;
import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class DiskCacheTest {

    @TempDir
    File file;

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

    @Test
    @SneakyThrows
    void shouldPrepopulateAccessMapFromExistingFilesUsingCanonicalKeys() {
        DiskCache diskCache = new DiskCache(file, "name");
        byte[] value = "hello".getBytes(StandardCharsets.UTF_8);
        diskCache.put("show.name.jpg", value);

        DiskCache restartedCache = new DiskCache(file, "name");
        for (int i = 1; i <= 500; i++) {
            restartedCache.put("key" + i, value);
        }

        assertThat(restartedCache.lookup("show.name.jpg"))
                .as("Restarted cache should evict the oldest pre-existing file")
                .isNull();
        assertThat(restartedCache.lookup("key1"))
                .as("Newer entries should remain in the cache")
                .isNotNull();
    }

    @Test
    @SneakyThrows
    void shouldDeleteOldestDiskFileWhenCacheIsOversizedAndAccessMapIsEmpty() {
        writeFile("old-file", 20_000_000, Instant.now().minusSeconds(3));
        writeFile("middle-file", 20_000_000, Instant.now().minusSeconds(2));
        writeFile("new-file", 20_000_000, Instant.now().minusSeconds(1));

        DiskCache diskCache = new DiskCache(file, "name");
        getAccessMap(diskCache).clear();

        diskCache.put("fresh-key", "small".getBytes(StandardCharsets.UTF_8));

        assertThat(new File(file, "old-file"))
                .as("Fallback cleanup should remove the oldest file on disk")
                .doesNotExist();
        assertThat(new File(file, "middle-file")).exists();
        assertThat(new File(file, "new-file")).exists();
    }

    @Test
    @SneakyThrows
    void shouldDeleteAsManyOldEntriesAsNeededWhenCacheIsOversized() {
        DiskCache diskCache = new DiskCache(file, "name");
        for (int i = 1; i <= 4; i++) {
            diskCache.put("small" + i, new byte[1_000_000]);
        }
        diskCache.put("large", new byte[48 * 1024 * 1024]);

        assertThat(diskCache.lookup("small1")).as("Oldest entry should be deleted").isNull();
        assertThat(diskCache.lookup("small2")).as("Second oldest entry should be deleted").isNull();
        assertThat(diskCache.lookup("small3")).as("Cache should stop deleting once below the limit").isNotNull();
        assertThat(diskCache.lookup("small4")).isNotNull();
        assertThat(diskCache.lookup("large")).isNotNull();
    }

    @Test
    @SneakyThrows
    void shouldKeepAccessDataSeparatePerInstance(@TempDir File otherDir) {
        DiskCache diskCache = new DiskCache(file, "name");
        DiskCache otherCache = new DiskCache(otherDir, "other");
        diskCache.put("key", "hello".getBytes(StandardCharsets.UTF_8));

        assertThat(getAccessMap(diskCache)).containsOnlyKeys("key");
        assertThat(getAccessMap(otherCache)).isEmpty();
    }

    @SuppressWarnings("unchecked")
    @SneakyThrows
    private Map<String, Instant> getAccessMap(DiskCache diskCache) {
        Field field = DiskCache.class.getDeclaredField("accessMap");
        field.setAccessible(true);
        return (Map<String, Instant>) field.get(diskCache);
    }

    @SneakyThrows
    private void writeFile(String name, int size, Instant lastModified) {
        File target = new File(file, name);
        Files.write(target.toPath(), new byte[size]);
        assertThat(target.setLastModified(lastModified.toEpochMilli())).isTrue();
    }
}
