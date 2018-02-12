package org.nzbhydra.mediainfo;

import com.google.common.base.Strings;
import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheLoader;
import com.google.common.cache.LoadingCache;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.mediainfo.InfoProvider.IdType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@RestController
public class MediaInfoWeb {

    private static final Logger logger = LoggerFactory.getLogger(MediaInfoWeb.class);


    @Autowired
    private InfoProvider infoProvider;
    @Autowired
    private ConfigProvider configProvider;


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
        try {
            return autocompleteCache.get(new CacheKey(type, input));
        } catch (ExecutionException e) {
            logger.warn("Error while trying to find autocomplete data for input {}: {}", input, e.getMessage());
            return Collections.emptyList();
        }
    }


    @RequestMapping(value = "/internalapi/redirectRid/{rid}", method = RequestMethod.GET, consumes = MediaType.ALL_VALUE)
    public void redirectTvRageId(@PathVariable("rid") String tvRageId, HttpServletResponse response) throws IOException {

        String url = null;
        try {
            MediaInfo mediaInfo = infoProvider.convert(tvRageId, IdType.TVRAGE);
            if (mediaInfo != null && mediaInfo.getTvMazeId().isPresent()) {
                url = "https://www.tvmaze.com/shows/" + mediaInfo.getTvMazeId().get();
                Optional<String> derefererOptional = configProvider.getBaseConfig().getMain().getDereferer();
                if (derefererOptional.isPresent() && !Strings.isNullOrEmpty(derefererOptional.get())) {
                    url = derefererOptional.get().replace("$s", url);
                }
            }
        } catch (InfoProviderException e) {
            //Was already handled, will return error
        }
        if (url != null) {
            logger.info("Redirecting to URL {}", url);
            response.sendRedirect(url);
        } else {
            response.sendError(400, "Unable to find TVRage entry for ID " + tvRageId);
        }

    }

    @Data
    @AllArgsConstructor
    private static class CacheKey {
        private AutocompleteType type;
        private String input;
    }

    private enum AutocompleteType {
        TV,
        MOVIE
    }

    @Data
    public static class MediaInfoTO {
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
