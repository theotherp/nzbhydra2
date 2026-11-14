

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
import java.util.Comparator;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.Callable;
import java.util.concurrent.ConcurrentHashMap;

public class DiskCache extends AbstractValueAdaptingCache {

    private static final Logger logger = LoggerFactory.getLogger(DiskCache.class);

    private static final int MAX_ENTRIES = 500;
    private static final int MAX_ENTRIES_SIZE_MB = 50;
    private static final long MAX_ENTRIES_SIZE_BYTES = MAX_ENTRIES_SIZE_MB * 1024L * 1024L;

    private final Map<String, Instant> accessMap = new ConcurrentHashMap<>();

    private final File cacheDir;
    private final String name;

    public DiskCache(File cacheDir, String name) {
        super(false);
        this.cacheDir = cacheDir;
        this.name = name;
        if (!cacheDir.mkdirs() && !cacheDir.exists()) {
            throw new RuntimeException("Error creating cache dir " + cacheDir.getAbsolutePath());
        }
        File[] existingFiles = cacheDir.listFiles();
        if (existingFiles != null) {
            for (File file : existingFiles) {
                accessMap.putIfAbsent(file.getName(), Instant.ofEpochMilli(file.lastModified()));
            }
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
            String cacheKey = sanitizeKey(keyString);
            accessMap.put(cacheKey, Instant.now());
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
            accessMap.put(sanitizeKey(keyString), Instant.now());
        } else {
            throw new RuntimeException("Illegal type for key " + key.getClass() + " and/or value " + value.getClass());
        }
        cleanAfterPut();
    }

    private void cleanAfterPut() {
        while (accessMap.size() > MAX_ENTRIES) {
            logger.debug(LoggingMarkers.CONFIG_READ_WRITE, "{} entries in cache - exceeds limit of {}", accessMap.size(), MAX_ENTRIES);
            deleteOldestEntry();
        }
        long cacheSizeInBytes = getCacheSizeInBytes();
        while (cacheSizeInBytes > MAX_ENTRIES_SIZE_BYTES) {
            logger.debug(LoggingMarkers.CONFIG_READ_WRITE, "Cache takes up too much space (more than {})", MAX_ENTRIES_SIZE_MB);
            long freedBytes = deleteOldestEntry();
            if (freedBytes < 0) {
                logger.debug(LoggingMarkers.DISK_CACHE, "Unable to delete any more entries from cache");
                break;
            }
            cacheSizeInBytes -= freedBytes;
        }
    }

    private long getCacheSizeInBytes() {
        File[] files = cacheDir.listFiles();
        if (files == null) {
            return 0;
        }
        return Arrays.stream(files).mapToLong(File::length).sum();
    }

    /**
     * Deletes the least recently accessed entry or, if no access data is known, the oldest file in the cache dir.
     *
     * @return the number of bytes freed on disk, or -1 if nothing could be removed
     */
    private long deleteOldestEntry() {
        Optional<Map.Entry<String, Instant>> oldestEntry = accessMap.entrySet().stream().min(Map.Entry.comparingByValue());
        if (oldestEntry.isPresent()) {
            logger.debug(LoggingMarkers.DISK_CACHE, "Removing oldest entry {}", oldestEntry.get());
            accessMap.remove(oldestEntry.get().getKey());
            return deleteFile(new File(cacheDir, oldestEntry.get().getKey()));
        }
        File[] files = cacheDir.listFiles();
        if (files == null) {
            return -1;
        }
        Optional<File> oldestFile = Arrays.stream(files).min(Comparator.comparingLong(File::lastModified));
        if (oldestFile.isEmpty()) {
            return -1;
        }
        long length = oldestFile.get().length();
        return FileUtils.deleteQuietly(oldestFile.get()) ? length : -1;
    }

    private long deleteFile(File file) {
        long length = file.length();
        return FileUtils.deleteQuietly(file) ? length : 0;
    }

    private String sanitizeKey(String keyString) {
        return keyString.replaceAll("[/\\\\:*?\"<>|.]", "_");
    }

    @NotNull
    private File buildKeyFile(String keyString) {
        return new File(cacheDir, sanitizeKey(keyString));
    }

    @Override
    public void evict(Object key) {
        if (key instanceof String keyString) {
            File keyFile = buildKeyFile(keyString);
            if (keyFile.exists()) {
                logger.debug(LoggingMarkers.CONFIG_READ_WRITE, "Evicting entry {}", keyString);
                accessMap.remove(sanitizeKey(keyString));
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
        accessMap.clear();
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
