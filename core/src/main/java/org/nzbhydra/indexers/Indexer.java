package org.nzbhydra.indexers;

import com.google.common.base.Objects;
import com.google.common.base.Stopwatch;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.database.IndexerAccessResult;
import org.nzbhydra.database.IndexerApiAccessEntity;
import org.nzbhydra.database.IndexerApiAccessRepository;
import org.nzbhydra.database.IndexerApiAccessType;
import org.nzbhydra.database.IndexerEntity;
import org.nzbhydra.database.IndexerRepository;
import org.nzbhydra.database.IndexerStatusEntity;
import org.nzbhydra.database.SearchResultEntity;
import org.nzbhydra.database.SearchResultRepository;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.indexers.exceptions.IndexerAuthException;
import org.nzbhydra.indexers.exceptions.IndexerErrorCodeException;
import org.nzbhydra.indexers.exceptions.IndexerSearchAbortedException;
import org.nzbhydra.indexers.exceptions.IndexerUnreachableException;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.mediainfo.InfoProvider.IdType;
import org.nzbhydra.mediainfo.InfoProviderException;
import org.nzbhydra.mediainfo.MediaInfo;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.IndexerSearchResult;
import org.nzbhydra.searching.ResultAcceptor;
import org.nzbhydra.searching.ResultAcceptor.AcceptorResult;
import org.nzbhydra.searching.SearchResultIdCalculator;
import org.nzbhydra.searching.SearchResultItem;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
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
import java.util.List;
import java.util.Locale;
import java.util.Map.Entry;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

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
    protected IndexerWebAccess indexerWebAccess;
    @Autowired
    protected ResultAcceptor resultAcceptor;
    @Autowired
    protected CategoryProvider categoryProvider;
    @Autowired
    protected InfoProvider infoProvider;

    public void initialize(IndexerConfig config, IndexerEntity indexer) {
        this.indexer = indexer;
        this.config = config;
        //TODO Set user agent, use proxy, etc

    }

    public IndexerSearchResult search(SearchRequest searchRequest, int offset, Integer limit) {
        IndexerSearchResult indexerSearchResult;
        try {
            indexerSearchResult = searchInternal(searchRequest, offset, limit);
        } catch (IndexerSearchAbortedException e) {
            logger.warn("Unexpected error while preparing search");
            indexerSearchResult = new IndexerSearchResult(this, e.getMessage());
        } catch (IndexerAccessException e) {
            handleIndexerAccessException(e, IndexerApiAccessType.SEARCH); //TODO do I actually need the url?
            indexerSearchResult = new IndexerSearchResult(this, e.getMessage());
        } catch (Exception e) {
            logger.error("Unexpected error while searching", e);
            try {
                handleFailure(e.getMessage(), false, IndexerApiAccessType.SEARCH, null, IndexerAccessResult.CONNECTION_ERROR); //TODO depending on type of error, perhaps not at all because it might be a bug
            } catch (Exception e1) {
                logger.error("Error while handling indexer failure. API access was not saved to database", e1);
            }
            indexerSearchResult = new IndexerSearchResult(this, e.getMessage());
        }

        return indexerSearchResult;
    }

    protected IndexerSearchResult searchInternal(SearchRequest searchRequest, int offset, Integer limit) throws IndexerSearchAbortedException, IndexerAccessException {
        UriComponentsBuilder builder = buildSearchUrl(searchRequest, offset, limit);
        URI url = builder.build().toUri();

        T response;
        Stopwatch stopwatch = Stopwatch.createStarted();
        info("Calling {}", url);

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

        completeIndexerSearchResult(response, indexerSearchResult, acceptorResult);

        int endIndex = Math.min(indexerSearchResult.getOffset() + indexerSearchResult.getLimit(), indexerSearchResult.getOffset() + searchResultItems.size());
        debug("Returning results {}-{} of {} available ({} already rejected)", indexerSearchResult.getOffset(), endIndex, indexerSearchResult.getTotalResults(), acceptorResult.getNumberOfRejectedResults());

        return indexerSearchResult;
    }

    protected abstract void completeIndexerSearchResult(T response, IndexerSearchResult indexerSearchResult, AcceptorResult acceptorResult);

    protected abstract List<SearchResultItem> getSearchResultItems(T searchRequestResponse);

    protected abstract UriComponentsBuilder buildSearchUrl(SearchRequest searchRequest, Integer offset, Integer limit) throws IndexerSearchAbortedException;

    public abstract NfoResult getNfo(String guid);

    @Transactional
    protected List<SearchResultItem> persistSearchResults(List<SearchResultItem> searchResultItems) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        ArrayList<SearchResultEntity> searchResultEntities = new ArrayList<>();
        for (SearchResultItem item : searchResultItems) {
            SearchResultEntity searchResultEntity = searchResultRepository.findByIndexerAndIndexerGuid(indexer, item.getIndexerGuid());
            if (searchResultEntity == null) {
                searchResultEntity = new SearchResultEntity();

                //Set all entity relevant data
                searchResultEntity.setIndexer(indexer);
                searchResultEntity.setTitle(item.getTitle());
                searchResultEntity.setLink(item.getLink());
                searchResultEntity.setDetails(item.getDetails());
                searchResultEntity.setIndexerGuid(item.getIndexerGuid());
                searchResultEntity.setFirstFound(Instant.now());
                searchResultEntities.add(searchResultEntity);
            }
            //TODO Unify guid and searchResultId which are the same
            long guid = SearchResultIdCalculator.calculateSearchResultId(item);
            item.setGuid(guid);
            item.setSearchResultId(guid);
        }
        searchResultRepository.save(searchResultEntities);

        getLogger().debug("Persisting {} search search results took {}ms", searchResultEntities.size(), stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return searchResultItems;
    }

    protected void handleSuccess(IndexerApiAccessType accessType, Long responseTime) {
        IndexerStatusEntity status = indexer.getStatus();
        status.setLevel(0);
        status.setDisabledPermanently(false);
        status.setDisabledUntil(null);
        indexerRepository.save(indexer);

        IndexerApiAccessEntity apiAccess = new IndexerApiAccessEntity(indexer);
        apiAccess.setAccessType(accessType);
        apiAccess.setResponseTime(responseTime);
        apiAccess.setResult(IndexerAccessResult.SUCCESSFUL);
        apiAccess.setTime(Instant.now());
        indexerApiAccessRepository.save(apiAccess);
    }

    protected void handleFailure(String reason, Boolean disablePermanently, IndexerApiAccessType accessType, Long responseTime, IndexerAccessResult accessResult) {
        IndexerStatusEntity status = indexer.getStatus();
        if (status.getLevel() == 0) {
            status.setFirstFailure(Instant.now());
        }
        status.setLevel(status.getLevel() + 1);
        status.setDisabledPermanently(disablePermanently);
        status.setLastFailure(Instant.now());
        long minutesToAdd = DISABLE_PERIODS.get(Math.min(DISABLE_PERIODS.size() - 1, status.getLevel() + 1));
        status.setDisabledUntil(Instant.now().plus(minutesToAdd, ChronoUnit.MINUTES));
        status.setReason(reason);
        indexerRepository.save(indexer);
        if (disablePermanently) {
            getLogger().warn("{} will be permanently disabled until reenabled by the user", indexer.getName());
        } else {
            getLogger().warn("Will disable {} until {}", indexer.getName(), status.getDisabledUntil());
        }

        IndexerApiAccessEntity apiAccess = new IndexerApiAccessEntity(indexer);
        apiAccess.setAccessType(accessType);
        apiAccess.setResponseTime(responseTime);
        apiAccess.setResult(accessResult);
        apiAccess.setTime(Instant.now());
        indexerApiAccessRepository.save(apiAccess);
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
            message = e.getCause().getMessage();
            error(message);
            apiAccessResult = IndexerAccessResult.CONNECTION_ERROR;
        } else {
            error(message, e);
            apiAccessResult = IndexerAccessResult.HYDRA_ERROR;
        }
        handleFailure(e.getMessage(), disablePermanently, accessType, null, apiAccessResult);
    }

    protected abstract T getAndStoreResultToDatabase(URI uri, IndexerApiAccessType apiAccessType) throws IndexerAccessException;

    protected <T> T getAndStoreResultToDatabase(URI uri, Class<T> responseType, IndexerApiAccessType apiAccessType) throws IndexerAccessException {
        Stopwatch stopwatch = Stopwatch.createStarted();
        Integer timeout = config.getTimeout().orElse(configProvider.getBaseConfig().getSearching().getTimeout());
        T result;
        try {
            result = indexerWebAccess.get(uri, responseType, timeout);
        } catch (IndexerAccessException e) {
            //handleIndexerAccessException(e, uri.toString(), apiAccessType);
            throw e;
        }
        long responseTime = stopwatch.elapsed(TimeUnit.MILLISECONDS);
        handleSuccess(apiAccessType, responseTime);
        return result;
    }

    protected String generateQueryIfApplicable(SearchRequest searchRequest, String query) throws IndexerSearchAbortedException {
        if (searchRequest.getQuery().isPresent()) {
            return searchRequest.getQuery().get();
        }

        boolean indexerDoesntSupportAnyOfTheProvidedIds = searchRequest.getIdentifiers().keySet().stream().noneMatch(x -> config.getSupportedSearchIds().contains(x));
        boolean queryGenerationPossible = !searchRequest.getIdentifiers().isEmpty() || searchRequest.getTitle().isPresent();
        boolean queryGenerationEnabled = configProvider.getBaseConfig().getSearching().getGenerateQueries().meets(searchRequest.getSource());
        if (!(queryGenerationPossible && queryGenerationEnabled && indexerDoesntSupportAnyOfTheProvidedIds)) {
            logger.debug("Query generation not needed, possible or configured");
            return query;
        }

        if (searchRequest.getTitle().isPresent()) {
            query = searchRequest.getTitle().get();
        } else if (searchRequest.getInternalData().getTitle().isPresent()) {
            query = searchRequest.getInternalData().getTitle().get(); //TODO Currently never set, when should it?
        } else {
            Entry<IdType, String> firstIdentifierEntry = searchRequest.getIdentifiers().entrySet().iterator().next();
            try {
                MediaInfo mediaInfo = infoProvider.convert(firstIdentifierEntry.getValue(), firstIdentifierEntry.getKey());
                if (!mediaInfo.getTitle().isPresent()) {
                    throw new IndexerSearchAbortedException("Unable to generate query because no title is known");
                }
                query = mediaInfo.getTitle().get();
            } catch (InfoProviderException e) {
                throw new IndexerSearchAbortedException("Error while getting infos to generate queries");
            }
        }

        if (searchRequest.getSeason().isPresent()) {
            if (searchRequest.getEpisode().isPresent()) {
                query += String.format(" s%02des%02d", searchRequest.getSeason().get(), searchRequest.getEpisode().get()); //TODO daily shows
            } else {
                query += String.format(" s%02d", searchRequest.getSeason().get());
            }
        }

        if (searchRequest.getAuthor().isPresent()) {
            query += " " + searchRequest.getAuthor().get();
        }


        info("Indexer does not support any of the supported IDs. The following query was generated: " + query);

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

    public Optional<Instant> tryParseDate(String dateString) {
        try {
            for (DateTimeFormatter formatter : DATE_FORMATs) {
                Instant instant = Instant.from(formatter.parse(dateString));
                return Optional.of(instant);
            }
        } catch (DateTimeParseException e) {
            logger.debug("Unable to parse date string " + dateString);
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

    protected abstract Logger getLogger();
}
