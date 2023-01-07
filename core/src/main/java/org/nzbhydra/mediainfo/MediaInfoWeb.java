package org.nzbhydra.mediainfo;

import com.google.common.base.Strings;
import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheLoader;
import com.google.common.cache.LoadingCache;
import com.google.common.net.UrlEscapers;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.mediainfo.MediaIdType;
import org.nzbhydra.springnative.ReflectionMarker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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

    private final LoadingCache<CacheKey, List<MediaInfoTO>> autocompleteCache = CacheBuilder.newBuilder()
        .maximumSize(100)
        .expireAfterWrite(7, TimeUnit.DAYS)

        .build(
                new CacheLoader<>() {
                    @Override
                    public List<MediaInfoTO> load(CacheKey key) throws Exception {
                        try {
                            List<MediaInfo> infos;
                            if (key.getType() == AutocompleteType.TV) {
                                infos = infoProvider.search(key.getInput(), MediaIdType.TVTITLE);
                            } else {
                                infos = infoProvider.search(key.getInput(), MediaIdType.MOVIETITLE);
                            }

                            return infos.stream().map(MediaInfoWeb::from).collect(Collectors.toList());
                        } catch (InfoProviderException e) {
                            logger.warn("Error while finding autocomplete data for input {} and type {}", key.getInput(), key.getType(), e);
                            return Collections.emptyList();
                        }
                    }
                });

    @RequestMapping(value = "/internalapi/autocomplete/{type}", produces = "application/json")
    public List<MediaInfoTO> autocomplete(@PathVariable("type") AutocompleteType type, @RequestParam("input") String input) throws ExecutionException {
        try {
            return autocompleteCache.get(new CacheKey(type, input));
        } catch (ExecutionException e) {
            logger.warn("Error while trying to find autocomplete data for input {}: {}", input, e.getMessage());
            return Collections.emptyList();
        }
    }


    @RequestMapping(value = "/internalapi/redirectRid/{rid}", method = RequestMethod.GET, consumes = MediaType.ALL_VALUE)
    public String redirectTvRageId(@PathVariable("rid") String tvRageId, HttpServletResponse response) throws IOException {

        String url = null;
        try {
            MediaInfo mediaInfo = infoProvider.convert(tvRageId, MediaIdType.TVRAGE);
            if (mediaInfo != null && mediaInfo.getTvMazeId().isPresent()) {
                url = "https://www.tvmaze.com/shows/" + mediaInfo.getTvMazeId().get();
                Optional<String> derefererOptional = configProvider.getBaseConfig().getMain().getDereferer();
                if (derefererOptional.isPresent() && !Strings.isNullOrEmpty(derefererOptional.get())) {
                    url = derefererOptional.get()
                            .replace("$s", UrlEscapers.urlFragmentEscaper().escape(url))
                            .replace("$us", url)
                    ;
                }
            }
        } catch (InfoProviderException e) {
            //Was already handled, will return error
        }
        if (url != null) {
            logger.info("Redirecting to URL {}", url);
            response.sendRedirect(url);
            return "";
        } else {
            return "TVMaze doesn't know this show and as TVRage doesn't exist anymore I can't provide you with infos on this show :-(";
        }

    }

    private static MediaInfoTO from(MediaInfo info) {
        MediaInfoTO to = new MediaInfoTO();
        to.setImdbId(info.getImdbId().orElse(null));
        to.setTmdbId(info.getTmdbId().orElse(null));
        to.setTvmazeId(info.getTvMazeId().orElse(null));
        to.setTvrageId(info.getTvRageId().orElse(null));
        to.setTvdbId(info.getTvDbId().orElse(null));
        to.setTitle(info.getTitle().orElse(null));
        to.setYear(info.getYear().orElse(null));
        to.setPosterUrl(info.getPosterUrl().orElse(null));
        return to;
    }

    @Data
    @ReflectionMarker
    @AllArgsConstructor
    @NoArgsConstructor
    private static class CacheKey {
        private AutocompleteType type;
        private String input;
    }

}
