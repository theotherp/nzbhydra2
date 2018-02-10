package org.nzbhydra.indexers;

import com.google.common.base.Objects;
import com.google.common.base.Stopwatch;
import joptsimple.internal.Strings;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.indexers.exceptions.*;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.mediainfo.InfoProvider.IdType;
import org.nzbhydra.mediainfo.InfoProviderException;
import org.nzbhydra.mediainfo.MediaInfo;
import org.nzbhydra.searching.*;
import org.nzbhydra.searching.SearchResultAcceptor.AcceptorResult;
import org.nzbhydra.searching.searchrequests.InternalData.FallbackState;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.Marker;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import javax.persistence.EntityExistsException;
import java.net.URI;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.Map.Entry;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Component
public abstract class Indexer<T> {

    public enum BackendType {
        NZEDB,
        NNTMUX,
        NEWZNAB
    }

    protected static final List<Integer> DISABLE_PERIODS = Arrays.asList(0, 15, 30, 60, 3 * 60, 6 * 60, 12 * 60, 24 * 60);
    private static final Logger logger = LoggerFactory.getLogger(Indexer.class);

    List<DateTimeFormatter> DATE_FORMATs = Arrays.asList(DateTimeFormatter.RFC_1123_DATE_TIME, DateTimeFormatter.ofPattern("EEE, dd MMM yyyy HH:mm:ss zzz", Locale.ENGLISH));

    protected IndexerEntity indexer;
    protected IndexerConfig config;

    @Autowired
    protected ConfigProvider configProvider;
    @Autowired
    protected IndexerRepository indexerRepository;
    @Autowired
    protected SearchResultRepository searchResultRepository;
    @Autowired
    protected IndexerApiAccessRepository indexerApiAccessRepository;
    @Autowired
    protected IndexerApiAccessEntityShortRepository indexerApiAccessShortRepository;
    @Autowired
    protected IndexerWebAccess indexerWebAccess;
    @Autowired
    protected SearchResultAcceptor resultAcceptor;
    @Autowired
    protected CategoryProvider categoryProvider;
    @Autowired
    protected InfoProvider infoProvider;
    @Autowired
    private ApplicationEventPublisher eventPublisher;


    public void initialize(IndexerConfig config, IndexerEntity indexer) {
        this.indexer = indexer;
        this.config = config;

    }

    public IndexerSearchResult search(SearchRequest searchRequest, int offset, Integer limit) {
        IndexerSearchResult indexerSearchResult;
        try {
            indexerSearchResult = searchInternal(searchRequest, offset, limit);

            boolean fallbackNeeded = indexerSearchResult.getTotalResults() == 0 && !searchRequest.getIdentifiers().isEmpty() && searchRequest.getInternalData().getFallbackState() != FallbackState.USED && configProvider.getBaseConfig().getSearching().getIdFallbackToQueryGeneration().meets(searchRequest.getSource());
            if (fallbackNeeded) {
                info("No results found for ID based search. Will do a fallback search using a generated query");

                //Search should be shown as successful (albeit empty) and should result in the number of expected finished searches to be increased
                eventPublisher.publishEvent(new IndexerSearchFinishedEvent(searchRequest));
                eventPublisher.publishEvent(new SearchMessageEvent(searchRequest, "Indexer " + getName() + " did not return any results. Will do a fallback search"));
                eventPublisher.publishEvent(new FallbackSearchInitiatedEvent(searchRequest));

                searchRequest.getInternalData().setFallbackState(FallbackState.REQUESTED);
                indexerSearchResult = searchInternal(searchRequest, offset, limit);
                eventPublisher.publishEvent(new SearchMessageEvent(searchRequest, "Indexer " + getName() + " completed fallback search successfully with " + indexerSearchResult.getTotalResults() + " total results"));
            } else {
                eventPublisher.publishEvent(new SearchMessageEvent(searchRequest, "Indexer " + getName() + " completed search successfully with " + indexerSearchResult.getTotalResults() + " total results"));
            }

        } catch (IndexerSearchAbortedException e) {
            logger.warn("Unexpected error while preparing search");
            indexerSearchResult = new IndexerSearchResult(this, e.getMessage());
            eventPublisher.publishEvent(new SearchMessageEvent(searchRequest, "Unexpected error while preparing search for indexer " + getName()));
        } catch (IndexerAccessException e) {
            handleIndexerAccessException(e, IndexerApiAccessType.SEARCH);
            indexerSearchResult = new IndexerSearchResult(this, e.getMessage());
            eventPublisher.publishEvent(new SearchMessageEvent(searchRequest, "Error while accessing indexer " + getName()));
        } catch (Exception e) {
            if (e.getCause() instanceof InterruptedException) {
                logger.debug("Hydra was shut down, ignoring InterruptedException");
                indexerSearchResult = new IndexerSearchResult(this, e.getMessage());
            } else {
                logger.error("Unexpected error while searching", e);
                eventPublisher.publishEvent(new SearchMessageEvent(searchRequest, "Unexpected error while searching indexer " + getName()));
                try {
                    handleFailure(e.getMessage(), false, IndexerApiAccessType.SEARCH, null, IndexerAccessResult.CONNECTION_ERROR); //LATER depending on type of error, perhaps not at all because it might be a bug
                } catch (Exception e1) {
                    logger.error("Error while handling indexer failure. API access was not saved to database", e1);
                }
                indexerSearchResult = new IndexerSearchResult(this, e.getMessage());
            }
        }
        eventPublisher.publishEvent(new IndexerSearchFinishedEvent(searchRequest));

        return indexerSearchResult;
    }

    protected IndexerSearchResult searchInternal(SearchRequest searchRequest, int offset, Integer limit) throws IndexerSearchAbortedException, IndexerAccessException {
        UriComponentsBuilder builder = buildSearchUrl(searchRequest, offset, limit);
        URI url = builder.build().toUri();

        T response;
        Stopwatch stopwatch = Stopwatch.createStarted();
        info("Calling {}", url.toString());

        response = getAndStoreResultToDatabase(url, IndexerApiAccessType.SEARCH);
        long responseTime = stopwatch.elapsed(TimeUnit.MILLISECONDS);

        stopwatch.reset();
        stopwatch.start();
        IndexerSearchResult indexerSearchResult = new IndexerSearchResult(this, true);
        List<SearchResultItem> searchResultItems = getSearchResultItems(response);
        info("Successfully executed search call in {}ms with {} results", responseTime, searchResultItems.size());
        AcceptorResult acceptorResult = resultAcceptor.acceptResults(searchResultItems, searchRequest, config);
        searchResultItems = acceptorResult.getAcceptedResults();
        indexerSearchResult.setReasonsForRejection(acceptorResult.getReasonsForRejection());

        searchResultItems = persistSearchResults(searchResultItems);
        indexerSearchResult.setSearchResultItems(searchResultItems);
        indexerSearchResult.setResponseTime(responseTime);

        completeIndexerSearchResult(response, indexerSearchResult, acceptorResult, searchRequest);

        int endIndex = Math.min(indexerSearchResult.getOffset() + indexerSearchResult.getLimit(), indexerSearchResult.getOffset() + searchResultItems.size());
        debug("Returning results {}-{} of {} available ({} already rejected)", indexerSearchResult.getOffset(), endIndex, indexerSearchResult.getTotalResults(), acceptorResult.getNumberOfRejectedResults());

        return indexerSearchResult;
    }

    /**
     * Responsible for filling the meta data of the IndexerSearchResult, e.g. number of available results and the used offset
     *
     * @param response            The web response from the indexer
     * @param indexerSearchResult The result to fill
     * @param acceptorResult      The result acceptor result
     * @param searchRequest       The original search request
     */
    protected abstract void completeIndexerSearchResult(T response, IndexerSearchResult indexerSearchResult, AcceptorResult acceptorResult, SearchRequest searchRequest);

    /**
     * Parse the given indexer web response and return the search result items
     *
     * @param searchRequestResponse The web response, e.g. an RssRoot or an HTML string
     * @return A list of SearchResultItems or empty
     * @throws IndexerParsingException Thrown when the web response could not be parsed
     */
    protected abstract List<SearchResultItem> getSearchResultItems(T searchRequestResponse) throws IndexerParsingException;

    protected abstract UriComponentsBuilder buildSearchUrl(SearchRequest searchRequest, Integer offset, Integer limit) throws IndexerSearchAbortedException;

    public abstract NfoResult getNfo(String guid);

    //May be overwritten by specific indexer implementations
    protected String cleanupQuery(String query) {

        return query;
    }

    @Transactional
    protected List<SearchResultItem> persistSearchResults(List<SearchResultItem> searchResultItems) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        synchronized (indexer) { //Locking per indexer prevents multiple threads trying to save the same "new" results to the database
            ArrayList<SearchResultEntity> searchResultEntities = new ArrayList<>();
            Set<Long> alreadySavedIds = searchResultRepository.findAllIdsByIdIn(searchResultItems.stream().map(SearchResultIdCalculator::calculateSearchResultId).collect(Collectors.toList()));
            for (SearchResultItem item : searchResultItems) {
                long guid = SearchResultIdCalculator.calculateSearchResultId(item);
                if (!alreadySavedIds.contains(guid)) {
                    SearchResultEntity searchResultEntity = new SearchResultEntity();

                    //Set all entity relevant data
                    searchResultEntity.setIndexer(indexer);
                    searchResultEntity.setTitle(item.getTitle());
                    searchResultEntity.setLink(item.getLink());
                    searchResultEntity.setDetails(item.getDetails());
                    searchResultEntity.setIndexerGuid(item.getIndexerGuid());
                    searchResultEntity.setFirstFound(Instant.now());
                    searchResultEntity.setDownloadType(item.getDownloadType());
                    searchResultEntity.setPubDate(item.getPubDate());
                    searchResultEntities.add(searchResultEntity);
                }
                //LATER Unify guid and searchResultId which are the same
                item.setGuid(guid);
                item.setSearchResultId(guid);
            }
            try {
                searchResultRepository.save(searchResultEntities);
            } catch (EntityExistsException e) {
                logger.error("Unable to save the search results to the database", e);
            }
        }

        getLogger().debug(LoggingMarkers.PERFORMANCE, "Handling of {} search results took {}ms", searchResultItems.size(), stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return searchResultItems;
    }

    protected void handleSuccess(IndexerApiAccessType accessType, Long responseTime) {
        //New state can only be enabled, if the user has disabled the indexer it wouldn't've been called
        getConfig().setState(IndexerConfig.State.ENABLED);
        configProvider.getBaseConfig().saveSafe();
        saveApiAccess(accessType, responseTime, IndexerAccessResult.SUCCESSFUL, true);
    }

    protected void handleFailure(String reason, Boolean disablePermanently, IndexerApiAccessType accessType, Long responseTime, IndexerAccessResult accessResult) {
        if (disablePermanently) {
            getLogger().warn("Because an unrecoverable error occurred {} will be permanently disabled until reenabled by the user", indexer.getName());
            getConfig().setState(IndexerConfig.State.DISABLED_SYSTEM);
        } else {
            //Set state first because the setters of the others depend on this
            getConfig().setState(IndexerConfig.State.DISABLED_SYSTEM_TEMPORARY);
            getConfig().setDisabledLevel(getConfig().getDisabledLevel() + 1);
            long minutesToAdd = DISABLE_PERIODS.get(Math.min(DISABLE_PERIODS.size() - 1, getConfig().getDisabledLevel()));
            getConfig().setDisabledUntil(Instant.now().plus(minutesToAdd, ChronoUnit.MINUTES).toEpochMilli());
            getLogger().warn("Because an error occurred {} will be temporariy disabled until {}", indexer.getName(), getConfig().getDisabledUntil());
        }
        getConfig().setLastError(reason);
        configProvider.getBaseConfig().saveSafe();

        saveApiAccess(accessType, responseTime, accessResult, false);
    }

    private void saveApiAccess(IndexerApiAccessType accessType, Long responseTime, IndexerAccessResult accessResult, boolean successful) {
        IndexerApiAccessEntity apiAccess = new IndexerApiAccessEntity(indexer);
        apiAccess.setAccessType(accessType);
        apiAccess.setResponseTime(responseTime);
        apiAccess.setResult(accessResult);
        apiAccess.setTime(Instant.now());
        indexerApiAccessRepository.save(apiAccess);

        indexerApiAccessShortRepository.save(new IndexerApiAccessEntityShort(indexer, successful));
    }

    protected void handleIndexerAccessException(IndexerAccessException e, IndexerApiAccessType accessType) {
        boolean disablePermanently = false;
        IndexerAccessResult apiAccessResult;
        String message = e.getMessage();
        if (e instanceof IndexerAuthException) {
            error("Indexer refused authentication");
            disablePermanently = true;
            apiAccessResult = IndexerAccessResult.AUTH_ERROR;
        } else if (e instanceof IndexerErrorCodeException) {
            error(message);
            apiAccessResult = IndexerAccessResult.API_ERROR;
        } else if (e instanceof IndexerUnreachableException) {
            message = e.getCause() != null ? e.getCause().getMessage() : e.getMessage();
            error(message);
            apiAccessResult = IndexerAccessResult.CONNECTION_ERROR;
        } else {
            //Anything else is probably a coding error, don't disable indexer
            saveApiAccess(accessType, null, IndexerAccessResult.HYDRA_ERROR, false);
            return;
        }
        handleFailure(e.getMessage(), disablePermanently, accessType, null, apiAccessResult);
    }

    /**
     * Implementations should call {link #getAndStoreResultToDatabase(java.net.URI, java.lang.Class, org.nzbhydra.database.IndexerApiAccessType)} with the class of the response
     *
     * @param uri           Called URI
     * @param apiAccessType Access type
     * @return The response from the indexer
     * @throws IndexerAccessException
     */
    protected abstract T getAndStoreResultToDatabase(URI uri, IndexerApiAccessType apiAccessType) throws IndexerAccessException;

    /**
     * Makes a call to the URI, saves the access result to the database and returns the web call response
     *
     * @param uri           URI to call
     * @param responseType  The type to expect from the response (e.g. RssRoot.class or String.class)
     * @param apiAccessType The API access type, needed for the database entry
     * @param <T>           Type to expect from the call
     * @return The web response
     * @throws IndexerAccessException
     */
    protected <T> T getAndStoreResultToDatabase(URI uri, Class<T> responseType, IndexerApiAccessType apiAccessType) throws IndexerAccessException {
        Stopwatch stopwatch = Stopwatch.createStarted();
        T result;
        try {
            result = callInderWebAccess(uri, responseType);
        } catch (IndexerAccessException e) {
            throw e;
        }
        long responseTime = stopwatch.elapsed(TimeUnit.MILLISECONDS);
        handleSuccess(apiAccessType, responseTime);
        return result;
    }

    <T> T callInderWebAccess(URI uri, Class<T> responseType) throws IndexerAccessException {
        return indexerWebAccess.get(uri, config, responseType);
    }

    protected String generateQueryIfApplicable(SearchRequest searchRequest, String query) throws IndexerSearchAbortedException {
        if (searchRequest.getQuery().isPresent()) {
            return searchRequest.getQuery().get();
        }

        boolean indexerDoesntSupportRequiredSearchType = config.getSupportedSearchTypes().stream().noneMatch(x -> searchRequest.getSearchType().matches(x));
        boolean indexerDoesntSupportAnyOfTheProvidedIds = searchRequest.getIdentifiers().keySet().stream().noneMatch(x -> config.getSupportedSearchIds().contains(x));
        boolean queryGenerationPossible = !searchRequest.getIdentifiers().isEmpty() || searchRequest.getTitle().isPresent();
        boolean queryGenerationEnabled = configProvider.getBaseConfig().getSearching().getGenerateQueries().meets(searchRequest.getSource());
        boolean fallbackRequested = searchRequest.getInternalData().getFallbackState() == FallbackState.REQUESTED;
        if (!(fallbackRequested || (queryGenerationPossible && queryGenerationEnabled && (indexerDoesntSupportAnyOfTheProvidedIds || indexerDoesntSupportRequiredSearchType)))) {
            return query;
        }
        if (searchRequest.getInternalData().getFallbackState() == FallbackState.REQUESTED) {
            searchRequest.getInternalData().setFallbackState(FallbackState.USED); //
        }

        if (searchRequest.getTitle().isPresent()) {
            query = sanitizeTitleForQuery(searchRequest.getTitle().get());
            debug("Search request provided title {}. Using that as query base.", query);
        } else if (searchRequest.getInternalData().getTitle().isPresent()) {
            query = searchRequest.getInternalData().getTitle().get();
        } else {
            Entry<IdType, String> firstIdentifierEntry = searchRequest.getIdentifiers().entrySet().iterator().next();
            try {
                MediaInfo mediaInfo = infoProvider.convert(firstIdentifierEntry.getValue(), firstIdentifierEntry.getKey());
                if (!mediaInfo.getTitle().isPresent()) {
                    throw new IndexerSearchAbortedException("Unable to generate query because no title is known");
                }
                query = sanitizeTitleForQuery(mediaInfo.getTitle().get());
                debug("Determined title to be {}. Using that as query base.", query);
            } catch (InfoProviderException e) {
                throw new IndexerSearchAbortedException("Error while getting infos to generate queries");
            }
        }

        if (searchRequest.getSeason().isPresent() && !fallbackRequested) { //Don't add season/episode string for fallback queries. Indexers usually still return correct results
            if (searchRequest.getEpisode().isPresent()) {
                debug("Using season {} and episode {} for query generation", searchRequest.getSeason().get(), searchRequest.getEpisode().get());
                try {
                    int episodeInt = Integer.parseInt(searchRequest.getEpisode().get());
                    query += String.format(" s%02de%02d", searchRequest.getSeason().get(), episodeInt);
                } catch (NumberFormatException e) {
                    String extendWith = String.format(" s%02d", searchRequest.getSeason().get()) + searchRequest.getEpisode().get();
                    query += extendWith;
                    debug("{} doesn't seem to be an integer, extending query with '{}'", searchRequest.getEpisode().get(), extendWith);
                }
            } else {
                debug("Using season {} for query generation", searchRequest.getSeason().get());
                query += String.format(" s%02d", searchRequest.getSeason().get());
            }
        }

        if (searchRequest.getSearchType() == SearchType.BOOK && !config.getSupportedSearchTypes().contains(ActionAttribute.BOOK)) {
            if (searchRequest.getAuthor().isPresent()) {
                query += " " + searchRequest.getAuthor().get();
                debug("Using author {} in query", searchRequest.getAuthor().get());
            }
        }

        debug("Indexer does not support any of the supplied IDs or the requested search type. The following query was generated: " + query);

        return query;
    }


    public String getName() {
        return config.getName();
    }

    public IndexerConfig getConfig() {
        return config;
    }

    public IndexerEntity getIndexerEntity() {
        return indexer;
    }

    public String cleanUpTitle(String title) {
        if (Strings.isNullOrEmpty(title)) {
            return title;
        }
        title = title.trim();
        for (String word : configProvider.getBaseConfig().getSearching().getRemoveTrailing()) {
            if (title.toLowerCase().endsWith(word.trim().toLowerCase())) {
                debug(LoggingMarkers.TRAILING, "Removing trailing {} from title {}", word, title);
                title = title.substring(0, title.length() - word.length()).trim();
                return title;
            }
        }
        return title;
    }

    protected String sanitizeTitleForQuery(String query) {
        if (query == null) {
            return null;
        }
        String sanitizedQuery = query.replaceAll("[\\(\\)=@#\\$%\\^,\\?<>{}\\|!':]", "");
        if (!sanitizedQuery.equals(query)) {
            logger.debug("Removed illegal characters from title '{}'. Title that will be used for query is '{}'", query, sanitizedQuery);
        }
        return sanitizedQuery;
    }

    public Optional<Instant> tryParseDate(String dateString) {
        for (DateTimeFormatter formatter : DATE_FORMATs) {
            try {
                Instant instant = Instant.from(formatter.parse(dateString));
                return Optional.of(instant);
            } catch (DateTimeParseException e) {
                logger.debug("Unable to parse date string " + dateString);
            }
        }
        return Optional.empty();
    }


    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        Indexer that = (Indexer) o;
        return Objects.equal(indexer.getName(), that.indexer.getName());
    }

    @Override
    public int hashCode() {
        return config == null ? 0 : Objects.hashCode(config.getName());
    }

    @Override
    public String toString() {
        return config.getName();
    }

    protected void error(String msg) {
        getLogger().error(getName() + ": " + msg);
    }

    protected void error(String msg, Throwable t) {
        getLogger().error(getName() + ": " + msg, t);
    }

    protected void info(String msg, Object... arguments) {
        getLogger().info(getName() + ": " + msg, arguments);
    }

    protected void debug(String msg, Object... arguments) {
        getLogger().debug(getName() + ": " + msg, arguments);
    }

    protected void debug(Marker marker, String msg, Object... arguments) {
        getLogger().debug(marker, getName() + ": " + msg, arguments);
    }

    protected abstract Logger getLogger();
}
