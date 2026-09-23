package org.nzbhydra.config;

import com.google.common.base.Strings;
import org.nzbhydra.config.auth.UserAuthConfig;
import org.nzbhydra.config.downloading.DownloaderConfig;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Collection;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.function.BiConsumer;
import java.util.function.Function;

/**
 * Makes sure every indexer, downloader and user carries a unique {@code id}.
 * <p>
 * The id is what a masked secret ({@code ***UNCHANGED***}) is resolved by when the UI saves the config, so it must
 * exist and be unique for every record the UI can see. Configs written by older versions are given ids by the config
 * migration, but a hand-edited file, a record added by the UI (which never invents ids) or an API client can still
 * produce records without one, or with one that another record already uses. Those get a fresh random id here, which
 * runs on every load and before every save. The first record using an id keeps it.
 */
public final class ConfigRecordIds {

    private static final Logger logger = LoggerFactory.getLogger(ConfigRecordIds.class);

    private ConfigRecordIds() {
    }

    public static String newId() {
        return UUID.randomUUID().toString();
    }

    /**
     * @return true if any record was given a new id
     */
    public static boolean ensureUniqueIds(BaseConfig baseConfig) {
        if (baseConfig == null) {
            return false;
        }
        boolean changed = ensureUniqueIds(baseConfig.getIndexers(), IndexerConfig::getId, IndexerConfig::setId, "indexer");
        if (baseConfig.getDownloading() != null) {
            changed |= ensureUniqueIds(baseConfig.getDownloading().getDownloaders(), DownloaderConfig::getId, DownloaderConfig::setId, "downloader");
        }
        if (baseConfig.getAuth() != null) {
            changed |= ensureUniqueIds(baseConfig.getAuth().getUsers(), UserAuthConfig::getId, UserAuthConfig::setId, "user");
        }
        return changed;
    }

    static <T> boolean ensureUniqueIds(Collection<T> records, Function<T, String> getter, BiConsumer<T, String> setter, String recordType) {
        if (records == null) {
            return false;
        }
        boolean changed = false;
        final Set<String> seen = new HashSet<>();
        for (T record : records) {
            if (record == null) {
                continue;
            }
            final String id = getter.apply(record);
            if (Strings.isNullOrEmpty(id) || !seen.add(id)) {
                final String newId = newId();
                if (!Strings.isNullOrEmpty(id)) {
                    logger.info("Found {} id {} used more than once. Assigning new id {}", recordType, id, newId);
                }
                setter.accept(record, newId);
                seen.add(newId);
                changed = true;
            }
        }
        return changed;
    }
}
