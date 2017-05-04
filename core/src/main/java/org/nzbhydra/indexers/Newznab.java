package org.nzbhydra.indexers;

import com.google.common.base.Joiner;
import com.google.common.base.Stopwatch;
import com.google.common.base.Strings;
import lombok.Getter;
import lombok.Setter;
import org.nzbhydra.database.IndexerAccessResult;
import org.nzbhydra.database.IndexerApiAccessType;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.indexers.exceptions.IndexerAuthException;
import org.nzbhydra.indexers.exceptions.IndexerErrorCodeException;
import org.nzbhydra.indexers.exceptions.IndexerProgramErrorException;
import org.nzbhydra.indexers.exceptions.IndexerSearchAbortedException;
import org.nzbhydra.indexers.exceptions.IndexerUnreachableException;
import org.nzbhydra.mapping.newznab.NewznabAttribute;
import org.nzbhydra.mapping.newznab.NewznabResponse;
import org.nzbhydra.mapping.newznab.RssError;
import org.nzbhydra.mapping.newznab.RssItem;
import org.nzbhydra.mapping.newznab.RssRoot;
import org.nzbhydra.mapping.newznab.Xml;
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
import org.nzbhydra.searching.SearchResultItem.DownloadType;
import org.nzbhydra.searching.SearchResultItem.HasNfo;
import org.nzbhydra.searching.UnknownResponseException;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Objects;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

@Getter
@Setter
@Component
public class Newznab extends Indexer {

    private static final Logger logger = LoggerFactory.getLogger(Newznab.class);

    static Map<IdType, String> idTypeToParamValueMap = new HashMap<>();
    static Map<String, IdType> paramValueToIdMap = new HashMap<>();

    private static final List<String> LANGUAGES = Arrays.asList(" English", " Korean", " Spanish", " French", " German", " Italian", " Danish", " Dutch", " Japanese", " Cantonese", " Mandarin", " Russian", " Polish", " Vietnamese", " Swedish", " Norwegian", " Finnish", " Turkish", " Portuguese", " Flemish", " Greek", " Hungarian");
    private static Pattern GROUP_PATTERN = Pattern.compile("Group:</b> ?([\\w\\.]+)<br ?/>");
    private static Pattern GUID_PATTERN = Pattern.compile("(.*/)?([a-zA-Z0-9@\\.]+)");


    static {
        idTypeToParamValueMap.put(IdType.IMDB, "imdbid");
        idTypeToParamValueMap.put(IdType.TMDB, "tmdbid");
        idTypeToParamValueMap.put(IdType.TVRAGE, "rid");
        idTypeToParamValueMap.put(IdType.TVDB, "tvdbid");
        idTypeToParamValueMap.put(IdType.TVMAZE, "tvmazeid");
        idTypeToParamValueMap.put(IdType.TRAKT, "traktid");

        paramValueToIdMap.put("imdbid", IdType.IMDB);
        paramValueToIdMap.put("tmdbid", IdType.TMDB);
        paramValueToIdMap.put("rid", IdType.TVRAGE);
        paramValueToIdMap.put("tvdbid", IdType.TVDB);
        paramValueToIdMap.put("tvmazeid", IdType.TVMAZE);
        paramValueToIdMap.put("traktid", IdType.TRAKT);
    }

    @Autowired
    private InfoProvider infoProvider;
    @Autowired
    private CategoryProvider categoryProvider;
    @Autowired
    private ResultAcceptor resultAcceptor;


    protected UriComponentsBuilder getBaseUri() {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(config.getHost());
        return builder.path("/api").queryParam("apikey", config.getApikey());
    }


    protected UriComponentsBuilder buildSearchUrl(SearchRequest searchRequest) throws IndexerSearchAbortedException {
        UriComponentsBuilder componentsBuilder = getBaseUri().queryParam("t", searchRequest.getSearchType().name().toLowerCase());

        String query = "";

        componentsBuilder = extendQueryUrlWithSearchIds(searchRequest, componentsBuilder);

        //Generate query if necessary, possible and enabled
        if (searchRequest.getQuery().isPresent()) {
            query = searchRequest.getQuery().get();
        } else {
            boolean indexerDoesntSupportAnyOfTheProvidedIds = searchRequest.getIdentifiers().keySet().stream().noneMatch(x -> config.getSupportedSearchIds().contains(x));
            boolean queryGenerationPossible = !searchRequest.getIdentifiers().isEmpty() || searchRequest.getTitle().isPresent();
            boolean queryGenerationEnabled = baseConfig.getSearching().getGenerateQueries().meets(searchRequest.getSource());
            if (queryGenerationPossible && queryGenerationEnabled && indexerDoesntSupportAnyOfTheProvidedIds) {
                if (searchRequest.getTitle().isPresent()) {
                    query = searchRequest.getTitle().get();
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
                info("Indexer does not support any of the supported IDs. The following query was generated: " + query);
            }
        }


        List<String> requiredWords = searchRequest.getInternalData().getRequiredWords();
        requiredWords.addAll(baseConfig.getSearching().getRequiredWords());
        requiredWords.addAll(searchRequest.getCategory().getRequiredWords());
        if (!requiredWords.isEmpty()) {
            query += (query.isEmpty() ? "" : " ") + Joiner.on(" ").join(requiredWords);
        }

        List<String> excludedWords = searchRequest.getInternalData().getExcludedWords();
        excludedWords.addAll(baseConfig.getSearching().getForbiddenWords());
        excludedWords.addAll(searchRequest.getCategory().getForbiddenWords());
        if (!excludedWords.isEmpty()) {
            if (config.getBackend().equals(BackendType.NZEDB) || config.getBackend().equals(BackendType.NNTMUX) || config.getHost().toLowerCase().contains("omgwtf")) {
                query += (query.isEmpty() ? "" : " ") + "!" + Joiner.on(",!").join(excludedWords);
            } else {
                query += (query.isEmpty() ? "" : " ") + "--" + Joiner.on(" --").join(excludedWords);
            }
        }

        if (config.getHost().toLowerCase().contains("nzbgeek")) {
            //With nzbgeek not more than 12 words at all are allowed
            String[] split = query.split(" ");
            if (query.split(" ").length > 12) {
                query = Joiner.on(" ").join(Arrays.copyOfRange(split, 0, 12));
            }
        }
        if (!query.isEmpty()) {
            componentsBuilder.queryParam("q", query);
        }

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

    protected UriComponentsBuilder extendQueryUrlWithSearchIds(SearchRequest searchRequest, UriComponentsBuilder componentsBuilder) throws IndexerSearchAbortedException {
        if (!searchRequest.getIdentifiers().isEmpty()) {
            Map<IdType, String> params = new HashMap<>();
            boolean indexerSupportsAnyOfTheProvidedIds = searchRequest.getIdentifiers().keySet().stream().anyMatch(x -> config.getSupportedSearchIds().contains(x));
            if (!indexerSupportsAnyOfTheProvidedIds) {
                boolean canConvertAnyId = searchRequest.getIdentifiers().keySet().stream().anyMatch(x -> config.getSupportedSearchIds().stream().anyMatch(y -> infoProvider.canConvert(x, y)));
                if (canConvertAnyId) {
                    for (Map.Entry<IdType, String> providedId : searchRequest.getIdentifiers().entrySet()) {
                        if (!params.containsKey(providedId.getKey())) {
                            try {
                                MediaInfo info = infoProvider.convert(providedId.getValue(), providedId.getKey());
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
                                error("Error while converting search ID", e);
                            }
                        }
                    }
                }
            }
            searchRequest.getIdentifiers().putAll(params);

            for (Map.Entry<IdType, String> entry : searchRequest.getIdentifiers().entrySet()) {
                //We just add all IDs that we have. Some indexers support more than they say or will find results under one ID but not the other
                componentsBuilder.queryParam(idTypeToParamValueMap.get(entry.getKey()), entry.getValue());
            }

        }
        return componentsBuilder;
    }

    @Override
    protected IndexerSearchResult searchInternal(SearchRequest searchRequest) throws IndexerSearchAbortedException {
        String url = buildSearchUrl(searchRequest).build().toUriString();

        Xml response;
        Stopwatch stopwatch = Stopwatch.createStarted();
        try {
            info("Calling {}", url);
            response = get(url, Xml.class);
            if (response instanceof RssError) {
                handleRssError((RssError) response, url);
            } else if (!(response instanceof RssRoot)) {
                throw new UnknownResponseException("Indexer returned unknown response");
            }

        } catch (IndexerAccessException e) {
            handleIndexerAccessException(e, url);

            IndexerSearchResult errorResult = new IndexerSearchResult(this, false);
            errorResult.setErrorMessage(e.getMessage());
            errorResult.setSearchResultItems(Collections.emptyList());

            return errorResult;
        }
        long responseTime = stopwatch.elapsed(TimeUnit.MILLISECONDS);
        handleSuccess(IndexerApiAccessType.SEARCH, responseTime, IndexerAccessResult.SUCCESSFUL, url);
        //noinspection ConstantConditions Actually checked above
        RssRoot rssRoot = (RssRoot) response;

        stopwatch.reset();
        stopwatch.start();
        IndexerSearchResult indexerSearchResult = new IndexerSearchResult(this, true);
        List<SearchResultItem> searchResultItems = getSearchResultItems(rssRoot);
        info("Successfully executed search call in {}ms with {} results", responseTime, searchResultItems.size());
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

        return indexerSearchResult;
    }

    private void handleIndexerAccessException(IndexerAccessException e, String url) {
        boolean disablePermanently = false;
        IndexerAccessResult apiAccessResult;
        if (e instanceof IndexerAuthException) {
            error("Indexer refused authentication");
            disablePermanently = true;
            apiAccessResult = IndexerAccessResult.AUTH_ERROR;
        } else if (e instanceof IndexerErrorCodeException) {
            error(e.getMessage());
            apiAccessResult = IndexerAccessResult.API_ERROR;
        } else if (e instanceof IndexerUnreachableException) {
            error(e.getMessage());
            apiAccessResult = IndexerAccessResult.CONNECTION_ERROR;
        } else {
            error(e.getMessage(), e);
            apiAccessResult = IndexerAccessResult.HYDRA_ERROR;
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
        searchResultItem.setCategory(categoryProvider.fromNewznabCategories(item.getCategory()));
        searchResultItem.setCommentsLink(item.getComments());

        for (NewznabAttribute attribute : item.getNewznabAttributes()) {
            searchResultItem.getAttributes().put(attribute.getName(), attribute.getValue());
            if (attribute.getName().equals("usenetdate")) {
                tryParseDate(attribute.getValue()).ifPresent(searchResultItem::setUsenetDate);
            } else if (attribute.getName().equals("password") && !attribute.getValue().equals("0")) {
                searchResultItem.setPassworded(true);
            } else if (attribute.getName().equals("nfo")) {
                searchResultItem.setHasNfo(attribute.getValue().equals("1") ? HasNfo.YES : HasNfo.NO);
            } else if (attribute.getName().equals("info") && (config.getBackend() == BackendType.NNTMUX || config.getBackend() == BackendType.NZEDB)) {
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

        if (searchResultItem.getHasNfo() == HasNfo.MAYBE && (config.getBackend() == BackendType.NNTMUX || config.getBackend() == BackendType.NZEDB)) {
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


        if (config.getHost().contains("nzbgeek") && baseConfig.getSearching().isRemoveObfuscated()) {
            searchResultItem.setTitle(searchResultItem.getTitle().replace("-Obfuscated", ""));
        }
        if (baseConfig.getSearching().isRemoveLanguage()) {
            for (String language : LANGUAGES) {
                if (searchResultItem.getTitle().endsWith(language)) {
                    debug("Removing trailing {} from title {}", language, searchResultItem.getTitle());
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
