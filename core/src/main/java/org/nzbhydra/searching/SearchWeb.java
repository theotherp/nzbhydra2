package org.nzbhydra.searching;

import com.google.common.base.Splitter;
import com.google.common.base.Stopwatch;
import com.google.common.base.Strings;
import lombok.Data;
import lombok.NoArgsConstructor;
import net.jodah.expiringmap.ExpirationPolicy;
import net.jodah.expiringmap.ExpiringMap;
import org.nzbhydra.config.Category;
import org.nzbhydra.mediainfo.InfoProvider.IdType;
import org.nzbhydra.searching.dtoseventsenums.*;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.nzbhydra.searching.searchrequests.SearchRequestFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.http.MediaType;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;

@RestController
public class SearchWeb {

    private static final Logger logger = LoggerFactory.getLogger(SearchWeb.class);

    @Autowired
    private Searcher searcher;
    @Autowired
    private CategoryProvider categoryProvider;
    @Autowired
    private SearchRequestFactory searchRequestFactory;
    @Autowired
    private InternalSearchResultProcessor searchResultProcessor;

    private Lock lock = new ReentrantLock();

    private Map<Long, SearchState> searchStates = ExpiringMap.builder()
            .maxSize(10)
            .expiration(5, TimeUnit.MINUTES) //This should be more than enough... Nobody will wait that long
            .expirationPolicy(ExpirationPolicy.ACCESSED)
            .build();


    @Secured({"ROLE_USER"})
    @RequestMapping(value = "/internalapi/search", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public SearchResponse search(@RequestBody SearchRequestParameters parameters) {
        SearchRequest searchRequest = createSearchRequest(parameters);
        Stopwatch stopwatch = Stopwatch.createStarted();
        logger.info("New search request: " + searchRequest);
        org.nzbhydra.searching.SearchResult searchResult = searcher.search(searchRequest);

        SearchResponse searchResponse = searchResultProcessor.createSearchResponse(searchResult);

        lock.lock();
        SearchState searchState = searchStates.get(searchRequest.getSearchRequestId());
        searchState.setSearchFinished(true);
        lock.unlock();

        logger.info("Search took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return searchResponse;
    }

    @Secured({"ROLE_USER"})
    @RequestMapping(value = "/internalapi/search/state", produces = MediaType.APPLICATION_JSON_VALUE)
    public SearchState getSearchState(@RequestParam("searchrequestid") long searchRequestId) {
        return searchStates.getOrDefault(searchRequestId, new SearchState());
    }

    private SearchRequest createSearchRequest(@RequestBody SearchRequestParameters parameters) {
        Category category = categoryProvider.getByInternalName(parameters.getCategory());
        SearchType searchType = category.getSearchType() == null ? SearchType.SEARCH : category.getSearchType();
        SearchRequest searchRequest = searchRequestFactory.getSearchRequest(searchType, SearchSource.INTERNAL, category, parameters.getSearchRequestId(), parameters.getOffset(), parameters.getLimit());
        searchRequest.setLoadAll(parameters.isLoadAll());
        searchRequest.setIndexers(parameters.getIndexers());
        searchRequest.setQuery(parameters.getQuery());
        searchRequest.setMinage(parameters.getMinage());
        searchRequest.setMaxage(parameters.getMaxage());
        searchRequest.setMinsize(parameters.getMinsize());
        searchRequest.setMaxsize(parameters.getMaxsize());

        if (!Strings.isNullOrEmpty(parameters.getTitle())) {
            searchRequest.setTitle(parameters.getTitle());
        }

        if (!Strings.isNullOrEmpty(parameters.getImdbId())) {
            searchRequest.getIdentifiers().put(IdType.IMDB, parameters.getImdbId());
        }
        if (!Strings.isNullOrEmpty(parameters.getTmdbId())) {
            searchRequest.getIdentifiers().put(IdType.TMDB, parameters.getTmdbId());
        }

        if (!Strings.isNullOrEmpty(parameters.getTvrageId())) {
            searchRequest.getIdentifiers().put(IdType.TVRAGE, parameters.getTvrageId());
        }
        if (!Strings.isNullOrEmpty(parameters.getTvdbId())) {
            searchRequest.getIdentifiers().put(IdType.TVDB, parameters.getTvdbId());
        }
        if (!Strings.isNullOrEmpty(parameters.getTvmazeId())) {
            searchRequest.getIdentifiers().put(IdType.TVMAZE, parameters.getTvmazeId());
        }

        if (parameters.getSeason() != null) {
            searchRequest.setSeason(parameters.getSeason());
        }
        if (!Strings.isNullOrEmpty(parameters.getEpisode())) {
            searchRequest.setEpisode(parameters.getEpisode());
        }

        if (!searchRequest.getIdentifiers().isEmpty() && searchRequest.getQuery().isPresent()) {
            //Add additional restrictions to required words
            logger.debug("Adding additional search terms '{}' to required words", searchRequest.getQuery().get());
            searchRequest.getInternalData().getRequiredWords().addAll(Splitter.on(" ").splitToList(searchRequest.getQuery().get()));
            //Remove query, would be ignored by most indexers anyway
            searchRequest.setQuery(null);
        }

        searchRequest = searchRequestFactory.extendWithSavedIdentifiers(searchRequest);

        //Initialize messages for this search request
        searchStates.put(searchRequest.getSearchRequestId(), new SearchState());

        return searchRequest;
    }

    @EventListener
    public void handleSearchMessageEvent(SearchMessageEvent event) {
        if (searchStates.containsKey(event.getSearchRequest().getSearchRequestId())) {
            lock.lock();
            SearchState searchState = searchStates.get(event.getSearchRequest().getSearchRequestId());
            if (!searchState.getMessages().contains(event.getMessage())) {
                searchState.getMessages().add(event.getMessage());
            }
            lock.unlock();
        }
    }

    @EventListener
    public void handleIndexerSelectionEvent(IndexerSelectionEvent event) {
        if (searchStates.containsKey(event.getSearchRequest().getSearchRequestId())) {
            lock.lock();
            SearchState searchState = searchStates.get(event.getSearchRequest().getSearchRequestId());
            searchState.setIndexerSelectionFinished(true);
            searchState.setIndexersSelected(event.getIndexersSelected());
            lock.unlock();
        }
    }

    @EventListener
    public void handleFallbackSearchInitatedEvent(FallbackSearchInitiatedEvent event) {
        //An indexer will do a fallback search, meaning we'll have to wait for another indexer search. On the GUI side that's the same as if one more indexer had been selected
        if (searchStates.containsKey(event.getSearchRequest().getSearchRequestId())) {
            lock.lock();
            SearchState searchState = searchStates.get(event.getSearchRequest().getSearchRequestId());
            searchState.setIndexersSelected(searchState.getIndexersSelected() + 1);
            lock.unlock();
        }
    }

    @EventListener
    public void handleIndexerSearchFinishedEvent(IndexerSearchFinishedEvent event) {
        if (searchStates.containsKey(event.getSearchRequest().getSearchRequestId())) {
            lock.lock();
            SearchState searchState = searchStates.get(event.getSearchRequest().getSearchRequestId());
            searchState.setIndexersFinished(searchState.getIndexersFinished() + 1);
            lock.unlock();
        }
    }

    @Data
    @NoArgsConstructor
    private static class SearchState {

        private boolean indexerSelectionFinished = false;
        private boolean searchFinished = false;
        private int indexersSelected = 0;
        private int indexersFinished = 0;
        private List<String> messages = new ArrayList<>();

    }

}
