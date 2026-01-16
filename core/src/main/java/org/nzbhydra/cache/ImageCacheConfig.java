

package org.nzbhydra.cache;

import org.nzbhydra.NzbHydra;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.support.AbstractCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.File;
import java.util.Collection;
import java.util.List;

@Configuration
public class ImageCacheConfig {


    @Bean
    public CacheManager imageCacheManager() {
        return new AbstractCacheManager() {
            @Override
            protected Collection<? extends Cache> loadCaches() {
                return List.of(new DiskCache(new File(NzbHydra.getDataFolder(), "cache"), "images"));
            }
        };
    }

}
