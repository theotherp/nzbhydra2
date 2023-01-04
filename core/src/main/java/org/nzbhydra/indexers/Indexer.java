package org.nzbhydra.indexers;

import com.google.common.base.Objects;
import com.google.common.base.Stopwatch;
import jakarta.persistence.EntityExistsException;
import joptsimple.internal.Strings;
import org.nzbhydra.config.BaseConfigHandler;
import org.nzbhydra.config.ConfigChangedEvent;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.indexers.exceptions.IndexerAuthException;
import org.nzbhydra.indexers.exceptions.IndexerErrorCodeException;
import org.nzbhydra.indexers.exceptions.IndexerNoIdConversionPossibleException;
import org.nzbhydra.indexers.exceptions.IndexerParsingException;
import org.nzbhydra.indexers.exceptions.IndexerSearchAbortedException;
import org.nzbhydra.indexers.exceptions.IndexerUnreachableException;
import org.nzbhydra.indexers.status.IndexerLimitRepository;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.notifications.IndexerDisabledNotificationEvent;
import org.nzbhydra.notifications.IndexerReenabledNotificationEvent;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.CustomQueryAndTitleMapping;
import org.nzbhydra.searching.SearchResultAcceptor;
import org.nzbhydra.searching.SearchResultAcceptor.AcceptorResult;
import org.nzbhydra.searching.SearchResultIdCalculator;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.searching.dtoseventsenums.FallbackSearchInitiatedEvent;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchFinishedEvent;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchMessageEvent;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.searchrequests.InternalData.FallbackState;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.Marker;
import org.springframework.aot.hint.annotation.Reflective;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@SuppressWarnings("TypeParameterHidesVisibleType")
@Reflective
@Component
public abstract class Indexer<T> {

    public enum BackendType {
        NZEDB,
        NNTMUX,
        NEWZNAB
    }

    protected static final List<Integer> DISABLE_PERIODS = Arrays.asList(0, 5, 15, 30, 60, 3 * 60);
    private static final Logger logger = LoggerFactory.getLogger(Indexer.class);

    private static final List<DateTimeFormatter> DATE_FORMATs = Arrays.asList(DateTimeFormatter.RFC_1123_DATE_TIME, DateTimeFormatter.ofPattern("EEE, dd MMM yyyy HH:mm:ss zzz", Locale.ENGLISH));

    private final Object dbLock = "";

    protected IndexerEntity indexer;
    protected IndexerConfig config;
    private Pattern cleanupPattern;


    protected ConfigProvider configProvider;

    protected IndexerRepository indexerRepository;

    protected SearchResultRepository searchResultRepository;

    protected IndexerApiAccessRepository indexerApiAccessRepository;

    protected IndexerApiAccessEntityShortRepository indexerApiAccessShortRepository;

    private IndexerLimitRepository indexerStatusRepository;

    protected IndexerWebAccess indexerWebAccess;

    protected SearchResultAcceptor resultAcceptor;

    protected CategoryProvider categoryProvider;

    protected InfoProvider infoProvider;

    private ApplicationEventPublisher eventPublisher;

    private QueryGenerator queryGenerator;

    private CustomQueryAndTitleMapping titleMapping;

    private BaseConfigHandler baseConfigHandler;


    protected Indexer() {
    }

    public Indexer(ConfigProvider configProvider, IndexerRepository indexerRepository, SearchResultRepository searchResultRepository, IndexerApiAccessRepository indexerApiAccessRepository, IndexerApiAccessEntityShortRepository indexerApiAccessShortRepository, IndexerLimitRepository indexerStatusRepository, IndexerWebAccess indexerWebAccess, SearchResultAcceptor resultAcceptor, CategoryProvider categoryProvider, InfoProvider infoProvider, ApplicationEventPublisher eventPublisher, QueryGenerator queryGenerator, CustomQueryAndTitleMapping titleMapping, BaseConfigHandler baseConfigHandler) {
        this.configProvider = configProvider;
        this.indexerRepository = indexerRepository;
        this.searchResultRepository = searchResultRepository;
        this.indexerApiAccessRepository = indexerApiAccessRepository;
        this.indexerApiAccessShortRepository = indexerApiAccessShortRepository;
        this.indexerStatusRepository = indexerStatusRepository;
        this.indexerWebAccess = indexerWebAccess;
        this.resultAcceptor = resultAcceptor;
        this.categoryProvider = categoryProvider;
        this.infoProvider = infoProvider;
        this.eventPublisher = eventPublisher;
        this.queryGenerator = queryGenerator;
        this.titleMapping = titleMapping;
        this.baseConfigHandler = baseConfigHandler;
    }

    public void initialize(IndexerConfig config, IndexerEntity indexer) {
        this.indexer = indexer;
        this.config = config;
        if (queryGenerator == null) {
            logger.error("Indexer {} not properly initialized. No beans autowired.", config.getName());
        }
    }

    @EventListener
    public void handleNewConfig(ConfigChangedEvent configChangedEvent) {
        cleanupPattern = null;
    }

    public IndexerSearchResult search(SearchRequest searchRequest, int offset, Integer limit) {
        IndexerSearchResult indexerSearchResult;
        try {
            indexerSearchResult = searchInternal(searchRequest, offset, limit);

            if (isFallbackRequired(searchRequest, indexerSearchResult)) {
                info("No results found for ID based search. Will do a fallback search using a generated query");

                //Search should be shown as successful (albeit empty) and should result in the number of expected finished searches to be increased
                eventPublisher.publishEvent(new IndexerSearchFinishedEvent(searchRequest));
                eventPublisher.publishEvent(new SearchMessageEvent(searchRequest, "Indexer " + getName() + " did not return any results. Will do a fallback search", getName()));
                eventPublisher.publishEvent(new FallbackSearchInitiatedEvent(searchRequest));

                searchRequest.getInternalData().setFallbackStateByIndexer(getName(), FallbackState.REQUESTED);
                indexerSearchResult = searchInternal(searchRequest, offset, limit);
                eventPublisher.publishEvent(new SearchMessageEvent(searchRequest, indexerSearchResult.getTotalResults() + " results via fallback search from " + getName(), getName()));
            } else {
                eventPublisher.publishEvent(new SearchMessageEvent(searchRequest, indexerSearchResult.getTotalResults() + " results via search from " + getName(), getName()));

            }

        } catch (IndexerNoIdConversionPossibleException e) {
            info(e.getMessage());
            indexerSearchResult = new IndexerSearchResult(this, e.getMessage());
            eventPublisher.publishEvent(new SearchMessageEvent(searchRequest, e.getMessage()));
        } catch (IndexerSearchAbortedException e) {
            warn("Unexpected error while preparing search: " + e.getMessage());
            indexerSearchResult = new IndexerSearchResult(this, e.getMessage());
            eventPublisher.publishEvent(new SearchMessageEvent(searchRequest, "Unexpected error while preparing search for indexer " + getName(), getName()));
        } catch (IndexerAccessException e) {
            handleIndexerAccessException(e, IndexerApiAccessType.SEARCH);
            indexerSearchResult = new IndexerSearchResult(this, e.getMessage());
            eventPublisher.publishEvent(new SearchMessageEvent(searchRequest, "Error while accessing indexer " + getName(), getName()));
        } catch (Exception e) {
            if (e.getCause() instanceof InterruptedException) {
                debug("Hydra was shut down, ignoring InterruptedException");
                indexerSearchResult = new IndexerSearchResult(this, e.getMessage());
            } else {
                error("Unexpected error while searching", e);
                eventPublisher.publishEvent(new SearchMessageEvent(searchRequest, "Unexpected error while searching indexer " + getName(), getName()));
                try {
                    handleFailure(e.getMessage(), false, IndexerApiAccessType.SEARCH, null, IndexerAccessResult.CONNECTION_ERROR); //LATER depending on type of error, perhaps not at all because it might be a bug
                } catch (Exception e1) {
                    error("Error while handling indexer failure. API access was not saved to database", e1);
                }
                indexerSearchResult = new IndexerSearchResult(this, e.getMessage());
            }
        }
        eventPublisher.publishEvent(new IndexerSearchFinishedEvent(searchRequest));

        return indexerSearchResult;
    }

    private boolean isFallbackRequired(SearchRequest searchRequest, IndexerSearchResult indexerSearchResult) {
        final FallbackState fallbackStateByIndexer = searchRequest.getInternalData().getFallbackStateByIndexer(getName());
        return indexerSearchResult.getTotalResults() == 0 && !searchRequest.getIdentifiers().isEmpty() && fallbackStateByIndexer != FallbackState.USED && configProvider.getBaseConfig().getSearching().getIdFallbackToQueryGeneration().meets(searchRequest);
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
        List<SearchResultItem> searchResultItems = getSearchResultItems(response, searchRequest);
        for (SearchResultItem searchResultItem : searchResultItems) {
            try {
                titleMapping.mapSearchResult(searchResultItem, configProvider.getBaseConfig().getSearching().getCustomMappings());
            } catch (Exception e) {
                error("Error mapping search result title for " + searchResultItem.getTitle(), e);
            }
        }

        indexerSearchResult.setPageSize(searchResultItems.size());
        debug(LoggingMarkers.PERFORMANCE, "Parsing of results took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
        AcceptorResult acceptorResult = resultAcceptor.acceptResults(searchResultItems, searchRequest, config);
        searchResultItems = acceptorResult.getAcceptedResults();
        indexerSearchResult.setReasonsForRejection(acceptorResult.getReasonsForRejection());

        searchResultItems = persistSearchResults(searchResultItems, indexerSearchResult);
        indexerSearchResult.setSearchResultItems(searchResultItems);
        indexerSearchResult.setResponseTime(responseTime);

        completeIndexerSearchResult(response, indexerSearchResult, acceptorResult, searchRequest, offset, limit);
        info("Successfully executed search call in {}ms with {} total results", responseTime, indexerSearchResult.getTotalResults());

        int endIndex = Math.min(indexerSearchResult.getOffset() + indexerSearchResult.getPageSize(), indexerSearchResult.getOffset() + searchResultItems.size());
        endIndex = Math.min(indexerSearchResult.getTotalResults(), endIndex);
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
    protected abstract void completeIndexerSearchResult(T response, IndexerSearchResult indexerSearchResult, AcceptorResult acceptorResult, SearchRequest searchRequest, int offset, Integer limit);

    /**
     * Parse the given indexer web response and return the search result items
     *
     * @param searchRequestResponse The web response, e.g. an RssRoot or an HTML string
     * @param searchRequest         The request used for the search
     * @return A list of SearchResultItems or empty
     * @throws IndexerParsingException Thrown when the web response could not be parsed
     */
    protected abstract List<SearchResultItem> getSearchResultItems(T searchRequestResponse, SearchRequest searchRequest) throws IndexerParsingException;

    protected abstract UriComponentsBuilder buildSearchUrl(SearchRequest searchRequest, Integer offset, Integer limit) throws IndexerSearchAbortedException;

    public abstract NfoResult getNfo(String guid);

    //May be overwritten by specific indexer implementations
    protected String cleanupQuery(String query) {
        return query;
    }

    @Transactional
    protected List<SearchResultItem> persistSearchResults(List<SearchResultItem> searchResultItems, IndexerSearchResult indexerSearchResult) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        synchronized (dbLock) { //Locking per indexer prevents multiple threads trying to save the same "new" results to the database
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
            debug("Found {} results which were already in the database and {} new ones", alreadySavedIds.size(), searchResultEntities.size());
            try {
                searchResultRepository.saveAll(searchResultEntities);
                indexerSearchResult.setSearchResultEntities(new HashSet<>(searchResultEntities));
            } catch (EntityExistsException e) {
                error("Unable to save the search results to the database", e);
            }
        }

        getLogger().debug(LoggingMarkers.PERFORMANCE, "Persisting {} search results took {}ms", searchResultItems.size(), stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return searchResultItems;
    }

    protected void handleSuccess(IndexerApiAccessType accessType, Long responseTime) {
        //New state can only be enabled; if the user had disabled the indexer it wouldn't've been called
        if (getConfig().getDisabledLevel() > 0) {
            debug("Indexer was successfully called after {} failed attempts in a row", getConfig().getDisabledLevel());
            eventPublisher.publishEvent(new IndexerReenabledNotificationEvent(getConfig().getName(), getConfig().getDisabledAt()));
        }
        getConfig().setState(IndexerConfig.State.ENABLED);
        getConfig().setLastError(null);
        getConfig().setDisabledUntil(null);
        getConfig().setDisabledLevel(0);
        getConfig().setDisabledAt(null);
        baseConfigHandler.save(false);
        saveApiAccess(accessType, responseTime, IndexerAccessResult.SUCCESSFUL, true);
    }

    protected void handleFailure(String reason, Boolean disablePermanently, IndexerApiAccessType accessType, Long responseTime, IndexerAccessResult accessResult) {
        if (disablePermanently) {
            getLogger().warn("Because an unrecoverable error occurred {} will be permanently disabled until reenabled by the user", indexer.getName());
            getConfig().setState(IndexerConfig.State.DISABLED_SYSTEM);
        } else if (!configProvider.getBaseConfig().getSearching().isIgnoreTemporarilyDisabled()) {
            getConfig().setState(IndexerConfig.State.DISABLED_SYSTEM_TEMPORARY);
            getConfig().setDisabledLevel(getConfig().getDisabledLevel() + 1);
            long minutesToAdd = DISABLE_PERIODS.get(Math.min(DISABLE_PERIODS.size() - 1, getConfig().getDisabledLevel()));
            Instant disabledUntil = Instant.now().plus(minutesToAdd, ChronoUnit.MINUTES);
            getConfig().setDisabledUntil(disabledUntil.toEpochMilli());
            getLogger().warn("Because an error occurred {} will be temporarily disabled until {}. This is error number {} in a row", indexer.getName(), disabledUntil, getConfig().getDisabledLevel());
        }
        getConfig().setLastError(reason);
        getConfig().setDisabledAt(Instant.now());
        baseConfigHandler.save(false);
        eventPublisher.publishEvent(new IndexerDisabledNotificationEvent(indexer.getName(), getConfig().getState(), reason));

        saveApiAccess(accessType, responseTime, accessResult, false);
    }

    private void saveApiAccess(IndexerApiAccessType accessType, Long responseTime, IndexerAccessResult accessResult, boolean successful) {
        IndexerApiAccessEntity apiAccess = new IndexerApiAccessEntity(indexer);
        apiAccess.setAccessType(accessType);
        apiAccess.setResponseTime(responseTime);
        apiAccess.setResult(accessResult);
        apiAccess.setTime(Instant.now());
        if (configProvider.getBaseConfig().getMain().isKeepHistory()) {
            indexerApiAccessRepository.save(apiAccess);
        }

        indexerApiAccessShortRepository.save(new IndexerApiAccessEntityShort(indexer, successful, accessType));
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
            error(message, e);
            apiAccessResult = IndexerAccessResult.API_ERROR;
        } else if (e instanceof IndexerUnreachableException) {
            message = e.getCause() != null ? e.getCause().getMessage() : e.getMessage();
            error(message, e);
            apiAccessResult = IndexerAccessResult.CONNECTION_ERROR;
        } else {
            //Anything else is probably a coding error, don't disable indexer
            saveApiAccess(accessType, null, IndexerAccessResult.HYDRA_ERROR, true); //Save as success, it's our fault
            error("An unexpected error occurred while communicating with the indexer: " + e.getMessage());
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
     */
    protected <T> T getAndStoreResultToDatabase(URI uri, Class<T> responseType, IndexerApiAccessType apiAccessType) throws IndexerAccessException {
        Stopwatch stopwatch = Stopwatch.createStarted();
        T result = callInderWebAccess(uri, responseType);

        long responseTime = stopwatch.elapsed(TimeUnit.MILLISECONDS);
        debug(LoggingMarkers.PERFORMANCE, "Call to {} took {}ms", uri, responseTime);
        handleSuccess(apiAccessType, responseTime);
        return result;
    }

    <T> T callInderWebAccess(URI uri, Class<T> responseType) throws IndexerAccessException {
        return indexerWebAccess.get(uri, config, responseType);
    }

    protected String generateQueryIfApplicable(SearchRequest searchRequest, String query) throws IndexerSearchAbortedException {
        return queryGenerator.generateQueryIfApplicable(searchRequest, query, this);
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
        title = title.trim().replace("&", "");

        List<String> removeTrailing = configProvider.getBaseConfig().getSearching().getRemoveTrailing().stream().map(x -> x.toLowerCase().trim()).toList();
        if (removeTrailing.isEmpty()) {
            return title;
        }

        //Tests need to reset pattern or something

        if (cleanupPattern == null) {
            String allPattern = "^(?<keep>.*)(" + removeTrailing.stream().map(x -> x.replace("*", "WILDCARDXXX").replaceAll("[-\\[\\]{}()*+?.,\\\\\\\\^$|#]", "\\\\$0").replace("WILDCARDXXX", ".*") + "$").collect(Collectors.joining("|")) + ")";
            cleanupPattern = Pattern.compile(allPattern, Pattern.CASE_INSENSITIVE);
        }
        Matcher matcher = cleanupPattern.matcher(title);
        while (matcher.matches()) {
            title = matcher.replaceAll("$1").trim();
            matcher = cleanupPattern.matcher(title);
        }

        return title;
    }


    public Optional<Instant> tryParseDate(String dateString) {
        for (DateTimeFormatter formatter : DATE_FORMATs) {
            try {
                Instant instant = Instant.from(formatter.parse(dateString));
                return Optional.of(instant);
            } catch (DateTimeParseException e) {
                debug("Unable to parse date string " + dateString);
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
        return (getConfig() == null || getConfig().getName() == null) ? 0 : config.getName().hashCode();
    }

    @Override
    public String toString() {
        return config.getName();
    }

    protected void warn(String msg) {
        getLogger().warn(getName() + ": " + msg);
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
