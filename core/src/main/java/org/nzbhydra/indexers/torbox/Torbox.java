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

package org.nzbhydra.indexers.torbox;

import com.google.common.base.Stopwatch;
import com.google.common.base.Strings;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.NotImplementedException;
import org.javers.common.collections.Lists;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.config.mediainfo.MediaIdType;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.indexers.IndexerApiAccessType;
import org.nzbhydra.indexers.IndexerHandlingStrategy;
import org.nzbhydra.indexers.NewznabCategoryComputer;
import org.nzbhydra.indexers.NfoResult;
import org.nzbhydra.indexers.QueryGenerator;
import org.nzbhydra.indexers.SearchRequestIdConverter;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.indexers.exceptions.IndexerNoIdConversionPossibleException;
import org.nzbhydra.indexers.exceptions.IndexerParsingException;
import org.nzbhydra.indexers.exceptions.IndexerSearchAbortedException;
import org.nzbhydra.indexers.torbox.mapping.TorboxResult;
import org.nzbhydra.indexers.torbox.mapping.TorboxResultType;
import org.nzbhydra.indexers.torbox.mapping.TorboxSearchResponse;
import org.nzbhydra.mapping.AgeToPubDateConverter;
import org.nzbhydra.searching.SearchResultAcceptor;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.config.ConfigurableBeanFactory;
import org.springframework.context.annotation.Scope;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

@Slf4j
@Component("torbox")
@Scope(ConfigurableBeanFactory.SCOPE_PROTOTYPE)
public class Torbox extends Indexer<Torbox.UsenetAndTorrentResponse> {

    private static final Map<MediaIdType, String> ID_TYPE_MAP = new HashMap<>();
    public static final Set<MediaIdType> SUPPORTED_MEDIA_ID_TYPES = Set.of(MediaIdType.IMDB, MediaIdType.TVDB);

    @Autowired
    private SearchRequestIdConverter searchRequestIdConverter;

    // TODO sist 04.01.2025: Search and add torrent results
    // TODO sist 04.01.2025: Show disabled download icon for direct download of torbox results
    // TODO sist 04.01.2025: Make sure whatever the setting for the torbox downloader is send the link to the result
    // TODO sist 04.01.2025: nice to have: If torbox is available as indexer show it for torbox results even if it's not the primary one?

    static {
        ID_TYPE_MAP.put(MediaIdType.IMDB, "imdb_id");
        ID_TYPE_MAP.put(MediaIdType.TMDB, "tmdb_id");
        ID_TYPE_MAP.put(MediaIdType.TVDB, "tvdb_id");
    }

    private final ExecutorService executorService = Executors.newFixedThreadPool(2);
    private final QueryGenerator queryGenerator;

    public Torbox(QueryGenerator queryGenerator) {
        this.queryGenerator = queryGenerator;
    }


    @Override
    protected void completeIndexerSearchResult(UsenetAndTorrentResponse response, IndexerSearchResult indexerSearchResult, SearchResultAcceptor.AcceptorResult acceptorResult, SearchRequest searchRequest, int offset, Integer limit) {
        indexerSearchResult.setTotalResultsKnown(true);
        indexerSearchResult.setTotalResults(response.torrent().getData().getTotalTorrents() + response.usenet.getData().getTotalNzbs());
        indexerSearchResult.setHasMoreResults(false);
        indexerSearchResult.setOffset(0);
        indexerSearchResult.setPageSize(indexerSearchResult.getTotalResults());
    }

    @Override
    protected List<SearchResultItem> getSearchResultItems(UsenetAndTorrentResponse searchRequestResponse, SearchRequest searchRequest) throws IndexerParsingException {
        final List<SearchResultItem> items = new ArrayList<>();
        final List<TorboxResult> allResults = Lists.join(searchRequestResponse.usenet().getData().getNzbs(), searchRequestResponse.torrent().getData().getTorrents());
        for (TorboxResult result : allResults) {
            SearchResultItem searchResultItem = new SearchResultItem();
            searchResultItem.setDownloadType(DownloadType.TORBOX);
            searchResultItem.setTitle(result.getRawTitle());
            searchResultItem.setIndexer(this);
            searchResultItem.setSize(result.getSize());
            searchResultItem.setAgePrecise(false);
            searchResultItem.setPubDate(AgeToPubDateConverter.convertToInstant(result.getAge()));
            if (result.getLastKnownSeeders() > -1) {
                searchResultItem.setSeeders(result.getLastKnownSeeders());
            }
            if (result.getLastKnownPeers() > -1) {
                searchResultItem.setPeers(result.getLastKnownPeers());
            }
            List<Integer> newznabCategories = result.getCategories().stream().map(Integer::valueOf).toList();
            NzbHydra.getApplicationContext().getBean(NewznabCategoryComputer.class).computeCategory(searchResultItem, newznabCategories, config);
            searchResultItem.setIndexerScore(config.getScore());
            searchResultItem.setIndexerGuid(String.valueOf(result.getHash()));
            if (result.getNzb() != null) {
                searchResultItem.setLink(result.getNzb());
            } else if (result.getMagnet() != null || result.getTorrent() != null) {
                if (result.getMagnet() != null) {
                    searchResultItem.setLink(result.getMagnet());
                } else {
                    searchResultItem.setLink(result.getTorrent());
                }
            } else {
                error("Result " + result.getRawTitle() + " has neither nzb nor magnet or torrent");
                continue;
            }
            items.add(searchResultItem);
        }
        return items;
    }

    @Override
    protected UriComponentsBuilder buildSearchUrl(SearchRequest searchRequest, Integer offset, Integer limit) throws IndexerSearchAbortedException {
        throw new NotImplementedException();
    }

    @Override
    protected IndexerSearchResult buildSearchUrlAndCall(SearchRequest searchRequest, int offset, Integer limit) throws IndexerAccessException {
        searchRequestIdConverter.convertSearchIdsIfNeeded(searchRequest, config);

        Stopwatch stopwatch = Stopwatch.createStarted();
        Future<TorboxSearchResponse> usenetFuture = executorService.submit(() -> buildAndCall(searchRequest, TorboxResultType.USENET));
        Future<TorboxSearchResponse> torrentFuture = executorService.submit(() -> buildAndCall(searchRequest, TorboxResultType.TORRENT));

        Optional<TorboxSearchResponse> usenetResponse = getResultWithTimeout(usenetFuture);
        Optional<TorboxSearchResponse> torrentResponse = getResultWithTimeout(torrentFuture);
        if (usenetResponse.isEmpty() && torrentResponse.isEmpty()) {
            throw new IndexerAccessException("Usenet and torrent search failed");
        }
        UsenetAndTorrentResponse response = new UsenetAndTorrentResponse(usenetResponse.orElse(new TorboxSearchResponse()), torrentResponse.orElse(new TorboxSearchResponse()));
        return processSearchResponse(searchRequest, offset, limit, stopwatch, response);
    }

    private TorboxSearchResponse buildAndCall(SearchRequest searchRequest, TorboxResultType searchType) throws IndexerSearchAbortedException, IndexerAccessException {
        UriComponentsBuilder builder = buildSearchUrl(searchRequest, searchType);
        URI url = builder.build().toUri();

        info("Calling {}", url.toString());
        TorboxSearchResponse usenetResponse = getAndStoreResultToDatabase(url, TorboxSearchResponse.class, IndexerApiAccessType.SEARCH);
        return usenetResponse;
    }


    private UriComponentsBuilder buildSearchUrl(SearchRequest searchRequest, TorboxResultType type) throws IndexerSearchAbortedException {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl("https://search-api.torbox.app");
        if (type == TorboxResultType.TORRENT) {
            builder.pathSegment("torrents");
        } else {
            builder.pathSegment("usenet");
        }
        boolean idSearch = false;
        for (MediaIdType idType : SUPPORTED_MEDIA_ID_TYPES) {
            if (searchRequest.getIdentifiers().containsKey(idType)) {
                idSearch = true;
                String idValue = searchRequest.getIdentifiers().get(idType);
                if (idType == MediaIdType.IMDB && !idValue.startsWith("tt")) {
                    idValue = "tt" + idValue;
                }
                builder.pathSegment(ID_TYPE_MAP.get(idType) + ":" + idValue);
                break;

            }
        }
        if (!idSearch) {
            builder.pathSegment("search");
            String query = queryGenerator.generateQueryIfApplicable(searchRequest, "", this);
            verifyIdentifiersNotUnhandled(searchRequest, builder, query);

            builder.path(query);
        }
        builder.queryParam("metadata", "false");


        return builder;
    }

    private void verifyIdentifiersNotUnhandled(SearchRequest searchRequest, UriComponentsBuilder componentsBuilder, String query) throws IndexerNoIdConversionPossibleException {
        //Make sure we didn't for some reason neither find any usable search IDs nor generate a query
        String currentUriString = componentsBuilder.toUriString();
        boolean noIdsOrIdWithNull = ID_TYPE_MAP.values().stream().noneMatch(currentUriString::contains);
        if (Strings.isNullOrEmpty(query) && !searchRequest.getIdentifiers().isEmpty() && noIdsOrIdWithNull) {
            throw new IndexerNoIdConversionPossibleException("Aborting searching for indexer because no usable search IDs could be found and no query was generated");
        }
    }

    @Override
    public NfoResult getNfo(String guid) {
        return null;
    }

    @Override
    protected UsenetAndTorrentResponse getAndStoreResultToDatabase(URI uri, IndexerApiAccessType apiAccessType) throws IndexerAccessException {
        return getAndStoreResultToDatabase(uri, UsenetAndTorrentResponse.class, apiAccessType);
    }

    @Override
    protected Logger getLogger() {
        return log;
    }

    private <T> Optional<T> getResultWithTimeout(Future<T> future) {
        try {
            Integer timeoutSeconds = config.getTimeout().orElse(configProvider.getBaseConfig().getSearching().getTimeout());
            return Optional.of(future.get(timeoutSeconds, TimeUnit.SECONDS));
        } catch (ExecutionException | InterruptedException | TimeoutException e) {
            log.error("Error searching torbox", e);
            return Optional.empty();
        }
    }

    @PreDestroy
    public void tearDown() {
        executorService.shutdownNow();
    }

    @Component
    @Order(2000)
    public static class HandlingStrategy implements IndexerHandlingStrategy<Torbox> {

        @Override
        public boolean handlesIndexerConfig(IndexerConfig config) {
            return config.getSearchModuleType() == SearchModuleType.TORBOX;
        }

        @Override
        public String getName() {
            return "TORBOX";
        }
    }

    public record UsenetAndTorrentResponse(TorboxSearchResponse usenet, TorboxSearchResponse torrent) {
    }
}
