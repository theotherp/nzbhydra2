package org.nzbhydra.searching;

import com.google.common.base.Splitter;
import com.google.common.base.Stopwatch;
import com.google.common.base.Strings;
import net.jodah.expiringmap.ExpirationPolicy;
import net.jodah.expiringmap.ExpiringMap;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.config.category.Category;
import org.nzbhydra.config.mediainfo.MediaIdType;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.searching.dtoseventsenums.FallbackSearchInitiatedEvent;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchFinishedEvent;
import org.nzbhydra.searching.dtoseventsenums.IndexerSelectionEvent;
import org.nzbhydra.searching.dtoseventsenums.SearchMessageEvent;
import org.nzbhydra.searching.dtoseventsenums.SearchRequestParameters;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchRequestFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.http.MediaType;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.Comparator;
import java.util.Locale;
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
    @Autowired
    private SimpMessageSendingOperations messagingTemplate;
    @Autowired
    private CustomQueryAndTitleMappingHandler customQueryAndTitleMappingHandler;
    @Autowired
    private DemoDataProvider demoDataProvider;

    private final Lock lock = new ReentrantLock();

    private final Map<Long, SearchState> searchStates = ExpiringMap.builder()
            .maxSize(50)
            .expiration(5, TimeUnit.MINUTES) //This should be more than enough... Nobody will wait that long
            .expirationPolicy(ExpirationPolicy.ACCESSED)
            .build();


    @Secured({"ROLE_USER"})
    @PostMapping(value = "/internalapi/search", produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public SearchResponse search(@RequestBody SearchRequestParameters parameters, Principal principal) {
        if (DemoModeWeb.isDemoModeActive(principal)) {
            logger.info("Demo mode active, returning mock search results for query '{}'", parameters.getQuery());
            sendMockSearchProgress(parameters.getSearchRequestId());
            return demoDataProvider.generateSearchResponse(parameters);
        }

        SearchRequest searchRequest = createSearchRequest(parameters);
        Stopwatch stopwatch = Stopwatch.createStarted();
        logger.info("New search request: {}", searchRequest);
        org.nzbhydra.searching.SearchResult searchResult = searcher.search(searchRequest);

        SearchResponse searchResponse = searchResultProcessor.createSearchResponse(searchResult);

        SearchState searchState;
        lock.lock();
        try {
            searchState = searchStates.get(searchRequest.getSearchRequestId());
            searchState.setSearchFinished(true);
        } finally {
            lock.unlock();
        }
        sendSearchState(searchState);

        logger.info("Web search took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return searchResponse;
    }

    @Secured({"ROLE_USER"})
    @PostMapping("/internalapi/shortcutSearch/{searchRequestId}")
    public void shortcutSearch(@PathVariable Long searchRequestId) {
        logger.info("Requested shortcut of search with ID {}", searchRequestId);
        searcher.shortcutSearch(searchRequestId);
    }


    private void sendSearchState(SearchState searchState) {
        messagingTemplate.convertAndSend("/topic/searchState", searchState);
    }

    /**
     * Sends mock WebSocket search progress messages to simulate 3 demo indexers completing
     * their searches over ~2 seconds. This makes the progress modal feel realistic during the tour.
     */
    private void sendMockSearchProgress(long searchRequestId) {
        String[] demoIndexerNames = {"DemoIndexer1", "DemoIndexer2", "DemoIndexer3"};

        // Step 1: Initial state — search started
        SearchState state = new SearchState(searchRequestId);
        sendSearchState(state);

        // Step 2: Indexer selection finished — 3 indexers selected
        state.setIndexerSelectionFinished(true);
        state.setIndexersSelected(demoIndexerNames.length);
        state.getMessages().add(new SortableMessage("Searching DemoIndexer1", "DemoIndexer1"));
        state.getMessages().add(new SortableMessage("Searching DemoIndexer2", "DemoIndexer2"));
        state.getMessages().add(new SortableMessage("Searching DemoIndexer3", "DemoIndexer3"));
        sendSearchState(state);

        // Step 3: Simulate indexers finishing one by one with short delays
        try {
            for (int i = 0; i < demoIndexerNames.length; i++) {
                Thread.sleep(500 + (i * 200)); // 500ms, 700ms, 900ms
                state.setIndexersFinished(i + 1);
                state.getMessages().set(i, new SortableMessage(
                        demoIndexerNames[i] + " returned results", demoIndexerNames[i]
                ));
                sendSearchState(state);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            logger.warn("Demo search progress simulation interrupted");
        }

        // Step 4: Search finished
        state.setSearchFinished(true);
        sendSearchState(state);
    }


    private SearchRequest createSearchRequest(@RequestBody SearchRequestParameters parameters) {
        Category category = categoryProvider.getByInternalName(parameters.getCategory());
        SearchType searchType;
        if (parameters.getMode() != null && category.getSubtype() == Category.Subtype.ALL) {
            //This may be the case when an API search is repeated from the history
            searchType = SearchType.valueOf(parameters.getMode().toUpperCase());
        } else {
            searchType = category.getSearchType() == null ? SearchType.SEARCH : category.getSearchType();
        }
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
            searchRequest.getIdentifiers().put(MediaIdType.IMDB, parameters.getImdbId());
        }
        if (!Strings.isNullOrEmpty(parameters.getTmdbId())) {
            searchRequest.getIdentifiers().put(MediaIdType.TMDB, parameters.getTmdbId());
        }

        if (!Strings.isNullOrEmpty(parameters.getTvrageId())) {
            searchRequest.getIdentifiers().put(MediaIdType.TVRAGE, parameters.getTvrageId());
        }
        if (!Strings.isNullOrEmpty(parameters.getTvdbId())) {
            searchRequest.getIdentifiers().put(MediaIdType.TVDB, parameters.getTvdbId());
        }
        if (!Strings.isNullOrEmpty(parameters.getTvmazeId())) {
            searchRequest.getIdentifiers().put(MediaIdType.TVMAZE, parameters.getTvmazeId());
        }

        if (parameters.getSeason() != null) {
            searchRequest.setSeason(parameters.getSeason());
        }
        if (!Strings.isNullOrEmpty(parameters.getEpisode())) {
            searchRequest.setEpisode(parameters.getEpisode());
        }

        if (!searchRequest.getIdentifiers().isEmpty() && searchRequest.getQuery().isPresent()) {
            //Add additional restrictions to required words
            logger.info("Moving additional search terms '{}' from query to required words", searchRequest.getQuery().get());
            searchRequest.getInternalData().getRequiredWords().addAll(Splitter.on(" ").splitToList(searchRequest.getQuery().get()));
            //Remove query, would be ignored by most indexers anyway
            searchRequest.setQuery(null);
        }

        searchRequest = searchRequestFactory.extendWithSavedIdentifiers(searchRequest);
        searchRequest = customQueryAndTitleMappingHandler.mapSearchRequest(searchRequest);

        //Initialize messages for this search request
        final SearchState searchState = new SearchState(searchRequest.getSearchRequestId());
        searchStates.put(searchRequest.getSearchRequestId(), searchState);
        sendSearchState(searchState);

        return searchRequest;
    }

    @EventListener
    public void handleSearchMessageEvent(SearchMessageEvent event) {
        updateAndSendSearchState(event.getSearchRequest().getSearchRequestId(), searchState -> {
            if (!searchState.getMessages().contains(event.getMessage())) {
                searchState.getMessages().add(event.getMessage());
                searchState.getMessages().sort(Comparator.comparing(x -> x.getMessageSortValue().toLowerCase(Locale.ROOT)));
                searchState.setModified(true);
            }
        });
    }

    @EventListener
    public void handleIndexerSelectionEvent(IndexerSelectionEvent event) {
        updateAndSendSearchState(event.getSearchRequest().getSearchRequestId(), searchState -> {
            searchState.setIndexerSelectionFinished(true);
            searchState.setIndexersSelected(event.getIndexersSelected());
        });
    }

    @EventListener
    public void handleFallbackSearchInitatedEvent(FallbackSearchInitiatedEvent event) {
        //An indexer will do a fallback search, meaning we'll have to wait for another indexer search. On the GUI side that's the same as if one more indexer had been selected
        updateAndSendSearchState(event.getSearchRequest().getSearchRequestId(), searchState ->
                searchState.setIndexersSelected(searchState.getIndexersSelected() + 1));
    }

    @EventListener
    public void handleIndexerSearchFinishedEvent(IndexerSearchFinishedEvent event) {
        updateAndSendSearchState(event.getSearchRequest().getSearchRequestId(), searchState ->
                searchState.setIndexersFinished(searchState.getIndexersFinished() + 1));
    }

    /**
     * Updates the search state under lock and sends it after releasing the lock.
     * The updater can set searchState.setModified(false) to skip sending.
     */
    private void updateAndSendSearchState(Long searchRequestId, java.util.function.Consumer<SearchState> updater) {
        if (!searchStates.containsKey(searchRequestId)) {
            return;
        }
        SearchState searchState;
        lock.lock();
        try {
            searchState = searchStates.get(searchRequestId);
            if (searchState == null) {
                return;
            }
            searchState.setModified(true);
            updater.accept(searchState);
        } finally {
            lock.unlock();
        }
        if (searchState.isModified()) {
            sendSearchState(searchState);
        }
    }

}
