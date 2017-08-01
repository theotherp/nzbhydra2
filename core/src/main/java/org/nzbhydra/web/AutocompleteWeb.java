package org.nzbhydra.web;

import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheLoader;
import com.google.common.cache.LoadingCache;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.mediainfo.InfoProvider.IdType;
import org.nzbhydra.mediainfo.InfoProviderException;
import org.nzbhydra.mediainfo.MediaInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@RestController
public class AutocompleteWeb {

    private static final Logger logger = LoggerFactory.getLogger(AutocompleteWeb.class);


    @Autowired
    private InfoProvider infoProvider;

    private LoadingCache<CacheKey, List<MediaInfoTO>> autocompleteCache = CacheBuilder.newBuilder()
            .maximumSize(100)
            .expireAfterWrite(7, TimeUnit.DAYS)

            .build(
                    new CacheLoader<CacheKey, List<MediaInfoTO>>() {
                        @Override
                        public List<MediaInfoTO> load(CacheKey key) throws Exception {
                            try {
                                List<MediaInfo> infos;
                                if (key.getType() == AutocompleteType.TV) {
                                    infos = infoProvider.search(key.getInput(), IdType.TVTITLE);
                                } else {
                                    infos = infoProvider.search(key.getInput(), IdType.MOVIETITLE);
                                }

                                return infos.stream().map(MediaInfoTO::new).collect(Collectors.toList());
                            } catch (InfoProviderException e) {
                                logger.error("Error while finding autocomplete data for input {} and type {}", key.getInput(), key.getType(), e);
                                return Collections.emptyList();
                            }
                        }
                    });

    @RequestMapping(value = "/internalapi/autocomplete/{type}/{input}", produces = "application/json")
    public List<MediaInfoTO> autocomplete(@PathVariable("type") AutocompleteType type, @PathVariable("input") String input) throws ExecutionException {
        return autocompleteCache.get(new CacheKey(type, input)); //TODO Handle provider not finding anything more graceful (don't log exception with stacktrace etc)
    }

    @Data
    @AllArgsConstructor
    private class CacheKey {
        private AutocompleteType type;
        private String input;
    }

    private enum AutocompleteType {
        TV,
        MOVIE
    }

    @Data
    public class MediaInfoTO {
        private String imdbId;
        private String tmdbId;
        private String tvmazeId;
        private String tvrageId;
        private String tvdbId;
        private String title;
        private Integer year;
        private String posterUrl;

        public MediaInfoTO(MediaInfo info) {
            this.imdbId = info.getImdbId().orElse(null);
            this.tmdbId = info.getTmdbId().orElse(null);
            this.tvmazeId = info.getTvMazeId().orElse(null);
            this.tvrageId = info.getTvRageId().orElse(null);
            this.tvdbId = info.getTvDbId().orElse(null);
            this.title = info.getTitle().orElse(null);
            this.year = info.getYear().orElse(null);
            this.posterUrl = info.getPosterUrl().orElse(null);
        }

    }
}
