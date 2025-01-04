/*
 *  (C) Copyright 2025 TheOtherP (theotherp@posteo.net)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.nzbhydra.indexers;

import com.google.common.base.Joiner;
import lombok.extern.slf4j.Slf4j;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.mediainfo.MediaIdType;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.mediainfo.InfoProviderException;
import org.nzbhydra.mediainfo.MediaInfo;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;

@Component
@Slf4j
public class SearchRequestIdConverter {

    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private InfoProvider infoProvider;

    public void convertSearchIdsIfNeeded(SearchRequest searchRequest, IndexerConfig config) {
        Map<MediaIdType, String> params = new HashMap<>();
        boolean idConversionNeeded = isIdConversionNeeded(searchRequest, config);
        if (idConversionNeeded) {
            log.debug("{}: Will try to convert IDs if possible", config.getName());
            boolean canConvertAnyId = infoProvider.canConvertAny(searchRequest.getIdentifiers().keySet(), new HashSet<>(config.getSupportedSearchIds()));
            if (canConvertAnyId) {
                log.debug("{}: Can convert any of provided IDs {} to at least one of supported IDs {}", config.getName(), searchRequest.getIdentifiers().keySet(), config.getSupportedSearchIds());
                try {
                    MediaInfo info = infoProvider.convert(searchRequest.getIdentifiers());

                    if (info.getImdbId().isPresent()) {
                        if (searchRequest.getSearchType() == SearchType.MOVIE && config.getSupportedSearchIds().contains(MediaIdType.IMDB)) {
                            params.put(MediaIdType.IMDB, info.getImdbId().get().replace("tt", ""));
                        }
                        //Most indexers don't actually support IMDB IDs for tv searches and would return unrelevant results
                        if (searchRequest.getSearchType() == SearchType.TVSEARCH && config.getSupportedSearchIds().contains(MediaIdType.TVIMDB)) {
                            params.put(MediaIdType.TVIMDB, info.getImdbId().get().replace("tt", ""));
                        }
                    }
                    if (info.getTmdbId().isPresent()) {
                        params.put(MediaIdType.TMDB, info.getTmdbId().get());
                    }
                    if (info.getTvRageId().isPresent()) {
                        params.put(MediaIdType.TVRAGE, info.getTvRageId().get());
                    }
                    if (info.getTvMazeId().isPresent()) {
                        params.put(MediaIdType.TVMAZE, info.getTvMazeId().get());
                    }
                    if (info.getTvDbId().isPresent()) {
                        params.put(MediaIdType.TVDB, info.getTvDbId().get());
                    }
                    log.debug("{}: Available search IDs: {}", config.getName(), params);
                } catch (InfoProviderException e) {
                    log.error("{}: Error while converting search ID", config.getName(), e);
                }
            } else {
                final String supportedSearchIds = config.getSupportedSearchIds().isEmpty() ? "[]" : Joiner.on(", ").join(config.getSupportedSearchIds());
                log.debug("{}: Unable to convert any of the provided IDs to any of these supported IDs: {}", config.getName(), supportedSearchIds);
            }
            if (params.isEmpty()) {
                log.warn("{}: Didn't find any usable IDs to add to search request", config.getName());
            }
        }

        //Don't overwrite IDs provided by the calling instance, only add missing ones
        params.forEach((key, value) -> searchRequest.getIdentifiers().putIfAbsent(key, value));
        if (searchRequest.getSearchType() == SearchType.TVSEARCH) {
            //IMDB is not the same as TVIMDB
            searchRequest.getIdentifiers().remove(MediaIdType.IMDB);
        }
    }

    private boolean isIdConversionNeeded(SearchRequest searchRequest, IndexerConfig config) {
        final boolean indexerNeedsConversion = searchRequest.getIdentifiers().keySet().stream().noneMatch(x -> searchRequest.getIdentifiers().get(x) != null && config.getSupportedSearchIds().contains(x));
        if (indexerNeedsConversion) {
            log.debug("{}: Indexer doesn't support any of the provided search IDs: {}", config.getName(), Joiner.on(", ").join(searchRequest.getIdentifiers().keySet()));
            return true;
        }
        if (searchRequest.getSource().meets(configProvider.getBaseConfig().getSearching().getAlwaysConvertIds())) {
            log.debug("{}: Will convert IDs as ID conversion is to be always done for {}", config.getName(), configProvider.getBaseConfig().getSearching().getAlwaysConvertIds());
            return true;
        }
        return false;
    }

}
