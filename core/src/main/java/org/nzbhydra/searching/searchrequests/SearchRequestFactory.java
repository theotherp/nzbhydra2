package org.nzbhydra.searching.searchrequests;

import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.SearchingConfig;
import org.nzbhydra.config.category.Category;
import org.nzbhydra.config.mediainfo.MediaIdType;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.mediainfo.Imdb;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.mediainfo.MovieInfo;
import org.nzbhydra.mediainfo.TvInfo;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class SearchRequestFactory {

    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private InfoProvider infoProvider;


    public SearchRequest getSearchRequest(SearchType searchType, SearchSource source, Category category, long searchRequestId, Integer offset, Integer limit) {
        final SearchingConfig searchingConfig = configProvider.getBaseConfig().getSearching();
        if (limit == null) {
            limit = source == SearchSource.INTERNAL ? searchingConfig.getLoadLimitInternal() : 100;
        }
        if (offset == null) {
            offset = 0;
        }
        SearchRequest searchRequest = new SearchRequest(source, searchType, offset, limit);
        searchRequest.setSource(source);
        searchRequest.setCategory(category);
        searchRequest.setSearchRequestId(searchRequestId);
        MDC.put("SEARCH", String.valueOf(searchRequestId));
        if (searchRequest.getMaxage().isEmpty() && searchingConfig.getMaxAge().isPresent()) {
            searchRequest.setMaxage(searchingConfig.getMaxAge().get());
        }

        return searchRequest;
    }

    public SearchRequest extendWithSavedIdentifiers(SearchRequest request) {
        if (!request.getIdentifiers().isEmpty()) {
            if (request.getIdentifiers().keySet().stream().anyMatch(x -> InfoProvider.TV_ID_TYPES.contains(x))) {
                TvInfo tvInfo = infoProvider.findTvInfoInDatabase(request.getIdentifiers());
                if (tvInfo != null) {
                    tvInfo.getTvmazeId().ifPresent(x -> request.getIdentifiers().putIfAbsent(MediaIdType.TVMAZE, x));
                    tvInfo.getTvdbId().ifPresent(x -> request.getIdentifiers().putIfAbsent(MediaIdType.TVDB, x));
                    tvInfo.getTvrageId().ifPresent(x -> request.getIdentifiers().putIfAbsent(MediaIdType.TVRAGE, x));
                    tvInfo.getImdbId().ifPresent(x -> request.getIdentifiers().putIfAbsent(MediaIdType.TVIMDB, Imdb.withTt(x)));
                }
            }
            if (request.getIdentifiers().keySet().stream().anyMatch(x -> InfoProvider.MOVIE_ID_TYPES.contains(x))) {
                MovieInfo movieInfo = infoProvider.findMovieInfoInDatabase(request.getIdentifiers());
                if (movieInfo != null) {
                    movieInfo.getTmdbId().ifPresent(x -> request.getIdentifiers().putIfAbsent(MediaIdType.TMDB, x));
                    movieInfo.getImdbId().ifPresent(x -> request.getIdentifiers().putIfAbsent(MediaIdType.IMDB, Imdb.withTt(x)));
                }
            }
        }
        return request;
    }


}
