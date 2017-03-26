package org.nzbhydra.indexers;

import com.google.common.base.Stopwatch;
import com.google.common.base.Strings;
import com.google.common.base.Throwables;
import lombok.Getter;
import lombok.Setter;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.database.IndexerApiAccessResult;
import org.nzbhydra.database.IndexerApiAccessType;
import org.nzbhydra.rssmapping.*;
import org.nzbhydra.searching.*;
import org.nzbhydra.searching.ResultAcceptor.AcceptorResult;
import org.nzbhydra.searching.SearchResultItem.DownloadType;
import org.nzbhydra.searching.SearchResultItem.HasNfo;
import org.nzbhydra.searching.exceptions.*;
import org.nzbhydra.searching.infos.Info;
import org.nzbhydra.searching.infos.InfoProvider;
import org.nzbhydra.searching.infos.InfoProvider.IdType;
import org.nzbhydra.searching.infos.InfoProviderException;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

@Getter
@Setter
@Component
public class Newznab extends Indexer {

    private static final Logger logger = LoggerFactory.getLogger(Newznab.class);

    private static Map<IdType, String> idTypeToParamValueMap = new HashMap<>();

    private static final List<String> LANGUAGES = Arrays.asList(" English", " Korean", " Spanish", " French", " German", " Italian", " Danish", " Dutch", " Japanese", " Cantonese", " Mandarin", " Russian", " Polish", " Vietnamese", " Swedish", " Norwegian", " Finnish", " Turkish", " Portuguese", " Flemish", " Greek", " Hungarian");
    private static Pattern GROUP_PATTERN = Pattern.compile("Group:</b> ?([\\w\\.]+)<br ?/>");
    private static Pattern GUID_PATTERN = Pattern.compile("(.*/)?([a-zA-Z0-9@\\.]+)");


    static {
        idTypeToParamValueMap.put(IdType.IMDB, "imdbid");
        idTypeToParamValueMap.put(IdType.TMDB, "tmdbid");
        idTypeToParamValueMap.put(IdType.TVRAGE, "rid");
        idTypeToParamValueMap.put(IdType.TVDB, "tvdbid");
        idTypeToParamValueMap.put(IdType.TVMAZE, "tvmazeid");
    }

    @Autowired
    protected RestTemplate restTemplate;
    @Autowired
    private InfoProvider infoProvider;
    @Autowired
    private CategoryProvider categoryProvider;
    @Autowired
    private BaseConfig baseConfig;
    @Autowired
    private ResultAcceptor resultAcceptor;


    protected UriComponentsBuilder getBaseUri() {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(config.getHost());
        return builder.path("/api").queryParam("apikey", config.getApikey());
    }

    @Override
    public IndexerSearchResult search(SearchRequest searchRequest, int offset, int limit) {

        IndexerSearchResult indexerSearchResult;
        try {
            indexerSearchResult = searchInternal(searchRequest);
            indexerSearchResult.setWasSuccessful(true);
        } catch (Exception e) {
            logger.error("Unexpected error while searching", e);
            try {
                handleFailure(e.getMessage(), false, IndexerApiAccessType.SEARCH, null, IndexerApiAccessResult.CONNECTION_ERROR, null); //TODO depending on type of error, perhaps not at all because it might be a bug
            } catch (Exception e1) {
                logger.error("Error while handling indexer failure. API access was not saved to database", e1);
            }
            IndexerSearchResult searchResult = new IndexerSearchResult(this, false);
            searchResult.setErrorMessage(e.getMessage());
            return searchResult;
        }
        return indexerSearchResult;
    }

    protected UriComponentsBuilder buildSearchUrl(SearchRequest searchRequest) {
        UriComponentsBuilder componentsBuilder = getBaseUri().queryParam("t", searchRequest.getSearchType().name().toLowerCase());

        if (searchRequest.getQuery().isPresent()) {
            componentsBuilder.queryParam("q", searchRequest.getQuery().get());
        }

        //TODO query generation
        componentsBuilder = extendQueryWithSearchIds(searchRequest, componentsBuilder);

        if (searchRequest.getSeason().isPresent()) {
            componentsBuilder.queryParam("season", searchRequest.getSeason().get());
        }
        if (searchRequest.getEpisode().isPresent()) {
            componentsBuilder.queryParam("ep", searchRequest.getEpisode().get());
        }

        if (searchRequest.getMinage().isPresent()) {
            componentsBuilder.queryParam("minage", searchRequest.getMinage().get());
        }
        if (searchRequest.getMaxage().isPresent()) {
            componentsBuilder.queryParam("maxage", searchRequest.getMaxage().get());
        }

        if (searchRequest.getMinsize().isPresent()) {
            componentsBuilder.queryParam("minsize", searchRequest.getMinsize().get());
        }
        if (searchRequest.getMaxsize().isPresent()) {
            componentsBuilder.queryParam("maxsize", searchRequest.getMaxsize().get());
        }

        if (searchRequest.getTitle().isPresent()) {
            componentsBuilder.queryParam("title", searchRequest.getTitle().get());
        }
        if (searchRequest.getAuthor().isPresent()) {
            componentsBuilder.queryParam("author", searchRequest.getAuthor().get());
        }

        if (baseConfig.getSearching().isIgnorePassworded()) {
            componentsBuilder.queryParam("password", "0");
        }


        return componentsBuilder;
    }

    protected UriComponentsBuilder extendQueryWithSearchIds(SearchRequest searchRequest, UriComponentsBuilder componentsBuilder) {
        if (!searchRequest.getIdentifiers().isEmpty()) {
            Map<IdType, String> params = new HashMap<>();
            boolean indexerSupportsAnyOfTheProvidedIds = searchRequest.getIdentifiers().keySet().stream().anyMatch(x -> config.getSupportedSearchIds().contains(x));
            if (!indexerSupportsAnyOfTheProvidedIds) {
                boolean canConvertAnyId = searchRequest.getIdentifiers().keySet().stream().anyMatch(x -> config.getSupportedSearchIds().stream().anyMatch(y -> infoProvider.canConvert(x, y)));
                if (canConvertAnyId) {
                    for (Map.Entry<IdType, String> providedId : searchRequest.getIdentifiers().entrySet()) {
                        if (!params.containsKey(providedId.getKey())) {
                            try {
                                Info info = infoProvider.convert(providedId.getValue(), providedId.getKey());
                                if (info.getImdbId().isPresent()) {
                                    params.put(IdType.IMDB, info.getImdbId().get());
                                }
                                if (info.getTmdbId().isPresent()) {
                                    params.put(IdType.TMDB, info.getTmdbId().get());
                                }
                                if (info.getTvRageId().isPresent()) {
                                    params.put(IdType.TVRAGE, info.getTvRageId().get());
                                }
                                if (info.getTvMazeId().isPresent()) {
                                    params.put(IdType.TVMAZE, info.getTvMazeId().get());
                                }
                                if (info.getTvDbId().isPresent()) {
                                    params.put(IdType.TVDB, info.getTvDbId().get());
                                }
                            } catch (InfoProviderException e) {
                                logger.error("Error while converting search ID", e);
                            }
                        }
                    }
                }
            }
            params.putAll(searchRequest.getIdentifiers());
            for (Map.Entry<IdType, String> entry : params.entrySet()) {
                componentsBuilder.queryParam(idTypeToParamValueMap.get(entry.getKey()), entry.getValue());
            }
        }
        return componentsBuilder;
    }

    protected IndexerSearchResult searchInternal(SearchRequest searchRequest) {
        String url = buildSearchUrl(searchRequest).build().toString();

        Xml response;
        Stopwatch stopwatch = Stopwatch.createStarted();
        try {
            try {
                logger.info("Calling {}", url);
                response = restTemplate.getForObject(url, Xml.class);
                if (response instanceof RssError) {
                    handleRssError((RssError) response, url);
                } else if (!(response instanceof RssRoot)) {
                    throw new UnknownResponseException("Indexer returned unknown response");
                }
            } catch (HttpStatusCodeException | ResourceAccessException e) {
                throw new IndexerUnreachableException(String.format("Error calling URL %s: %s", url, e.getMessage()));
            } catch (Exception e) {
                Throwables.throwIfInstanceOf(e, IndexerAccessException.class);
                throw new IndexerAccessException("An unexpected error occurred while calling the indexer", e);
            }
        } catch (IndexerAccessException e) {
            handleIndexerAccessException(e, url);

            IndexerSearchResult errorResult = new IndexerSearchResult(this, false);
            errorResult.setErrorMessage(e.getMessage());
            errorResult.setSearchResultItems(Collections.emptyList());
            return errorResult;
        }
        long responseTime = stopwatch.elapsed(TimeUnit.MILLISECONDS);
        logger.info("Successfully executed search call in {}ms", responseTime);
        handleSuccess(IndexerApiAccessType.SEARCH, responseTime, IndexerApiAccessResult.SUCCESSFUL, url);
        //noinspection ConstantConditions Actually checked above
        RssRoot rssRoot = (RssRoot) response;

        stopwatch.reset();
        stopwatch.start();
        IndexerSearchResult indexerSearchResult = new IndexerSearchResult(this, true);
        List<SearchResultItem> searchResultItems = getSearchResultItems(rssRoot);
        AcceptorResult acceptorResult = resultAcceptor.acceptResults(searchResultItems, searchRequest, config);
        searchResultItems = acceptorResult.getAcceptedResults();
        indexerSearchResult.setReasonsForRejection(acceptorResult.getReasonsForRejection());

        searchResultItems = persistSearchResults(searchResultItems);
        indexerSearchResult.setSearchResultItems(searchResultItems);
        indexerSearchResult.setResponseTime(responseTime);

        NewznabResponse newznabResponse = rssRoot.getRssChannel().getNewznabResponse();
        if (newznabResponse != null) {
            indexerSearchResult.setTotalResultsKnown(true);
            indexerSearchResult.setTotalResults(newznabResponse.getTotal());
            indexerSearchResult.setHasMoreResults(newznabResponse.getTotal() > newznabResponse.getOffset() + indexerSearchResult.getSearchResultItems().size()); //TODO Not all indexers report an offset
            indexerSearchResult.setOffset(newznabResponse.getOffset());
            indexerSearchResult.setLimit(newznabResponse.getOffset()); //TODO
        } else {
            indexerSearchResult.setTotalResultsKnown(false);
            indexerSearchResult.setHasMoreResults(false);
            indexerSearchResult.setOffset(0);
            indexerSearchResult.setLimit(0);
        }

        logger.info("Processed search searchResults in {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));

        return indexerSearchResult;
    }

    private void handleIndexerAccessException(IndexerAccessException e, String url) {
        boolean disablePermanently = false;
        IndexerApiAccessResult apiAccessResult;
        if (e instanceof IndexerAuthException) {
            logger.error("Indexer refused authentication");
            disablePermanently = true;
            apiAccessResult = IndexerApiAccessResult.AUTH_ERROR;
        } else if (e instanceof IndexerErrorCodeException) {
            logger.error(e.getMessage());
            apiAccessResult = IndexerApiAccessResult.API_ERROR;
        } else if (e instanceof IndexerUnreachableException) {
            logger.error(e.getMessage());
            apiAccessResult = IndexerApiAccessResult.CONNECTION_ERROR;
        } else {
            logger.error(e.getMessage(), e);
            apiAccessResult = IndexerApiAccessResult.HYDRA_ERROR;
        }
        handleFailure(e.getMessage(), disablePermanently, IndexerApiAccessType.SEARCH, null, apiAccessResult, url);
    }

    private void handleRssError(RssError response, String url) throws IndexerAccessException {
        if (Stream.of("100", "101", "102").anyMatch(x -> x.equals(response.getCode()))) {
            throw new IndexerAuthException(String.format("Indexer refused authentication. Error code: %s. Description: %s", response.getCode(), response.getDescription()));
        }
        if (Stream.of("200", "201", "202", "203").anyMatch(x -> x.equals(response.getCode()))) {
            throw new IndexerProgramErrorException(String.format("Indexer returned error code %s when URL %s was called", response.getCode(), url));
        }
        throw new IndexerErrorCodeException(response);
    }

    private List<SearchResultItem> getSearchResultItems(RssRoot rssRoot) {
        List<SearchResultItem> searchResultItems = new ArrayList<>();

        for (RssItem item : rssRoot.getRssChannel().getItems()) {
            SearchResultItem searchResultItem = createSearchResultItem(item);
            searchResultItems.add(searchResultItem);
        }

        return searchResultItems;
    }

    private SearchResultItem createSearchResultItem(RssItem item) {
        SearchResultItem searchResultItem = new SearchResultItem();
        searchResultItem.setLink(item.getLink());
        searchResultItem.setIndexerGuid(item.getRssGuid().getGuid());
        if (item.getRssGuid().getIsPermaLink()) {
            searchResultItem.setDetails(item.getRssGuid().getGuid());
            Matcher matcher = GUID_PATTERN.matcher(item.getRssGuid().getGuid());
            if (matcher.matches()) {
                searchResultItem.setIndexerGuid(matcher.group(2));
            }
        } else if (!Strings.isNullOrEmpty(item.getComments())) {
            searchResultItem.setDetails(item.getComments().replace("#comments", ""));
        }


        searchResultItem.setFirstFound(Instant.now());
        searchResultItem.setIndexer(this);
        searchResultItem.setTitle(item.getTitle());
        searchResultItem.setSize(item.getEnclosure().getLength());
        searchResultItem.setPubDate(item.getPubDate());
        searchResultItem.setIndexerScore(config.getScore().orElse(null));
        searchResultItem.setGuid(SearchResultIdCalculator.calculateSearchResultId(searchResultItem));
        searchResultItem.setAgePrecise(true);
        searchResultItem.setDescription(item.getDescription());
        searchResultItem.setDownloadType(DownloadType.NZB);
        searchResultItem.setCategory(categoryProvider.getNotAvailable());
        searchResultItem.setCommentsLink(item.getComments());

        for (NewznabAttribute attribute : item.getAttributes()) {
            searchResultItem.getAttributes().put(attribute.getName(), attribute.getValue());
            if (attribute.getName().equals("usenetdate")) {
                tryParseDate(attribute.getValue()).ifPresent(searchResultItem::setUsenetDate);
            } else if (attribute.getName().equals("password") && !attribute.getValue().equals("0")) {
                searchResultItem.setPassworded(true);
            } else if (attribute.getName().equals("nfo")) {
                searchResultItem.setHasNfo(attribute.getValue().equals("1") ? HasNfo.YES : HasNfo.NO);
            } else if (attribute.getName().equals("info") && (config.getBackend() == BACKEND_TYPE.NNTMUX || config.getBackend() == BACKEND_TYPE.NZEDB)) {
                //Info attribute is always a link to an NFO
                searchResultItem.setHasNfo(HasNfo.YES);
            } else if (attribute.getName().equals("group") && !attribute.getValue().equals("not available")) {
                searchResultItem.setGroup(attribute.getValue());
            } else if (attribute.getName().equals("files")) {
                searchResultItem.setFiles(Integer.valueOf(attribute.getValue()));
            } else if (attribute.getName().equals("comments")) {
                searchResultItem.setCommentsCount(Integer.valueOf(attribute.getValue()));
            } else if (attribute.getName().equals("grabs")) {
                searchResultItem.setGrabs(Integer.valueOf(attribute.getValue()));
            } else if (attribute.getName().equals("guid")) {
                searchResultItem.setIndexerGuid(attribute.getValue());
            }
        }

        if (searchResultItem.getHasNfo() == HasNfo.MAYBE && (config.getBackend() == BACKEND_TYPE.NNTMUX || config.getBackend() == BACKEND_TYPE.NZEDB)) {
            //For these backends if not specified it doesn't exist
            searchResultItem.setHasNfo(HasNfo.NO);
        }
        if (!Strings.isNullOrEmpty(item.getDescription()) && item.getDescription().contains("Group:")) {
            //Dog has the group in the description, perhaps others too
            Matcher matcher = GROUP_PATTERN.matcher(item.getDescription());
            if (matcher.matches() && !Objects.equals(matcher.group(1), "not available")) {
                searchResultItem.setGroup(matcher.group(1));
            }
        }

        searchResultItem.setCategory(categoryProvider.fromNewznabCategories(item.getCategory()));

        if (config.getHost().contains("nzbgeek") && baseConfig.getSearching().isRemoveObfuscated()) {
            searchResultItem.setTitle(searchResultItem.getTitle().replace("-Obfuscated", ""));
        }
        if (baseConfig.getSearching().isRemoveLanguage()) {
            for (String language : LANGUAGES) {
                if (searchResultItem.getTitle().endsWith(language)) {
                    logger.debug("Removing trailing {} from title {}", language, searchResultItem.getTitle());
                    searchResultItem.setTitle(searchResultItem.getTitle().substring(0, searchResultItem.getTitle().length() - language.length()));
                }
            }
        }
        return searchResultItem;
    }

    protected Logger getLogger() {
        return logger;
    }


}
