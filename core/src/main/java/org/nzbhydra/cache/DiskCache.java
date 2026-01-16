

package org.nzbhydra.cache;

import lombok.SneakyThrows;
import org.apache.commons.io.FileUtils;
import org.jetbrains.annotations.NotNull;
import org.nzbhydra.logging.LoggingMarkers;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.support.AbstractValueAdaptingCache;

import java.io.File;
import java.nio.file.Files;
import java.time.Instant;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.Callable;

public class DiskCache extends AbstractValueAdaptingCache {

    private static final Logger logger = LoggerFactory.getLogger(DiskCache.class);

    private static final int MAX_ENTRIES = 500;
    private static final int MAX_ENTRIES_SIZE_MB = 50;

    private static final Map<String, Instant> ACCESS_MAP = new HashMap<>();

    private final File cacheDir;
    private final String name;

    public DiskCache(File cacheDir, String name) {
        super(false);
        this.cacheDir = cacheDir;
        this.name = name;
        boolean created = cacheDir.mkdirs();
        if (!cacheDir.exists()) {
            throw new RuntimeException("Error creating cache dir " + cacheDir.getAbsolutePath());
        }
    }

    @Override
    public String getName() {
        return name;
    }

    @Override
    public Object getNativeCache() {
        return this;
    }

    @Override
    @SneakyThrows
    public <T> T get(Object key, Callable<T> valueLoader) {
        if (key instanceof String keyString) {
            ACCESS_MAP.put(keyString, Instant.now());
            File keyFile = buildKeyFile(keyString);
            if (keyFile.exists()) {
                return (T) Files.readAllBytes(keyFile.toPath());
            } else {
                T value = valueLoader.call();
                if ((value instanceof byte[] bytes)) {
                    Files.write(keyFile.toPath(), bytes);
                    return value;
                } else {
                    throw new RuntimeException("Illegal type for value " + value.getClass());
                }
            }
        } else {
            throw new RuntimeException("Illegal type for key " + key.getClass());
        }
    }

    @Override
    @SneakyThrows
    public void put(Object key, Object value) {
        if ((key instanceof String keyString) && (value instanceof byte[] valueBytes)) {
            logger.debug(LoggingMarkers.DISK_CACHE, "Writing entry with key {} and size {}", keyString, valueBytes.length);
            Files.write(buildKeyFile(keyString).toPath(), valueBytes);
            ACCESS_MAP.put(keyString, Instant.now());
        } else {
            throw new RuntimeException("Illegal type for key " + key.getClass() + " and/or value " + value.getClass());
        }
        cleanAfterPut();
    }

    private void cleanAfterPut() {
        while (ACCESS_MAP.size() > MAX_ENTRIES) {
            logger.debug(LoggingMarkers.CONFIG_READ_WRITE, "{} entries in cache - exceeds limit of {}", ACCESS_MAP.size(), MAX_ENTRIES);
            deleteOldestEntry();
        }
        while (Arrays.stream(cacheDir.listFiles()).mapToDouble(File::length).sum() / (1024 * 1024) > MAX_ENTRIES_SIZE_MB) {
            logger.debug(LoggingMarkers.CONFIG_READ_WRITE, "Cache takes up too much space (more than {})", MAX_ENTRIES_SIZE_MB);
            deleteOldestEntry();
        }
    }

    private void deleteOldestEntry() {
        Optional<Map.Entry<String, Instant>> oldestEntry = ACCESS_MAP.entrySet().stream().min(Map.Entry.comparingByValue());
        if (oldestEntry.isPresent()) {
            logger.debug(LoggingMarkers.DISK_CACHE, "Removing oldest entry {}", oldestEntry.get());
            ACCESS_MAP.remove(oldestEntry.get().getKey());
            FileUtils.deleteQuietly(buildKeyFile(oldestEntry.get().getKey()));
        }
    }

    @NotNull
    private File buildKeyFile(String keyString) {
        return new File(cacheDir, keyString);
    }

    @Override
    public void evict(Object key) {
        if (key instanceof String keyString) {
            File keyFile = buildKeyFile(keyString);
            if (keyFile.exists()) {
                logger.debug(LoggingMarkers.CONFIG_READ_WRITE, "Evicting entry {}", keyString);
                ACCESS_MAP.remove(keyString);
                FileUtils.deleteQuietly(keyFile);
            } else {
                logger.debug(LoggingMarkers.CONFIG_READ_WRITE, "Can't evict not existing entry {}", keyString);
            }
        }
    }

    @Override
    @SneakyThrows
    public void clear() {
        if (!cacheDir.exists()) {
            return;
        }
        logger.debug(LoggingMarkers.CONFIG_READ_WRITE, "Clearing cache");
        FileUtils.cleanDirectory(cacheDir);
        ACCESS_MAP.clear();
    }

    @Override
    @SneakyThrows
    protected Object lookup(Object key) {
        if (key instanceof String keyString) {
            File keyFile = buildKeyFile(keyString);
            if (keyFile.exists()) {
                logger.debug(LoggingMarkers.CONFIG_READ_WRITE, "Found entry for key {}", keyString);
                return Files.readAllBytes(keyFile.toPath());
            } else {
                logger.debug(LoggingMarkers.CONFIG_READ_WRITE, "Did not find entry for key {}", keyString);
            }
        }
        return null;
    }

}
