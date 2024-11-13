package org.nzbhydra.indexers;

import com.google.common.base.Joiner;
import com.google.common.base.Strings;
import lombok.Getter;
import lombok.Setter;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.NzbHydraException;
import org.nzbhydra.config.BaseConfigHandler;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.category.CategoriesConfig;
import org.nzbhydra.config.category.Category;
import org.nzbhydra.config.category.Category.Subtype;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.config.indexer.BackendType;
import org.nzbhydra.config.indexer.IndexerCategoryConfig;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.config.mediainfo.MediaIdType;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.indexers.capscheck.IndexerChecker;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.indexers.exceptions.IndexerAuthException;
import org.nzbhydra.indexers.exceptions.IndexerErrorCodeException;
import org.nzbhydra.indexers.exceptions.IndexerNoIdConversionPossibleException;
import org.nzbhydra.indexers.exceptions.IndexerProgramErrorException;
import org.nzbhydra.indexers.exceptions.IndexerSearchAbortedException;
import org.nzbhydra.indexers.status.IndexerLimit;
import org.nzbhydra.indexers.status.IndexerLimitRepository;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mapping.newznab.xml.NewznabAttribute;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlApilimits;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlChannel;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlEnclosure;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlError;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlResponse;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.nzbhydra.mapping.newznab.xml.Xml;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.mediainfo.InfoProviderException;
import org.nzbhydra.mediainfo.MediaInfo;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.CustomQueryAndTitleMappingHandler;
import org.nzbhydra.searching.SearchResultAcceptor;
import org.nzbhydra.searching.SearchResultAcceptor.AcceptorResult;
import org.nzbhydra.searching.SearchResultIdCalculator;
import org.nzbhydra.searching.UnknownResponseException;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem.HasNfo;
import org.nzbhydra.searching.searchrequests.InternalData;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.core.annotation.Order;
import org.springframework.oxm.Unmarshaller;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import javax.xml.transform.stream.StreamSource;
import java.io.IOException;
import java.io.StringReader;
import java.net.URI;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Getter
@Setter
public class Newznab extends Indexer<Xml> {

    private static final Logger logger = LoggerFactory.getLogger(Newznab.class);

    static Map<MediaIdType, String> idTypeToParamValueMap = new HashMap<>();

    private static final List<String> LANGUAGES = Arrays.asList(" English", " Korean", " Spanish", " French", " German", " Italian", " Danish", " Dutch", " Japanese", " Cantonese", " Mandarin", " Russian", " Polish", " Vietnamese", " Swedish", " Norwegian", " Finnish", " Turkish", " Portuguese", " Flemish", " Greek", " Hungarian");
    private static Pattern GROUP_PATTERN = Pattern.compile(".*Group:<\\/b> ?([\\w\\.]+)<br ?\\/>.*");
    private static final List<String> HOSTS_NOT_SUPPORTING_MOVIE_Q_SEARCH = Arrays.asList("dognzb", "nzbplanet", "nzbgeek", "6box");

    private static final Pattern TV_PATTERN = Pattern.compile("(?<showtitle>[\\w\\.\\-_]+)S(?<season>\\d+)e(?<episode>\\d+)|(?<season2>\\d{1,2})x(?<episode2>\\d{1,2})", Pattern.CASE_INSENSITIVE);


    static {
        idTypeToParamValueMap.put(MediaIdType.IMDB, "imdbid");
        idTypeToParamValueMap.put(MediaIdType.TVIMDB, "imdbid");
        idTypeToParamValueMap.put(MediaIdType.TMDB, "tmdbid");
        idTypeToParamValueMap.put(MediaIdType.TVRAGE, "rid");
        idTypeToParamValueMap.put(MediaIdType.TVDB, "tvdbid");
        idTypeToParamValueMap.put(MediaIdType.TVMAZE, "tvmazeid");
        idTypeToParamValueMap.put(MediaIdType.TRAKT, "traktid");
    }

    @Autowired
    private Unmarshaller unmarshaller;
    @Autowired
    private IndexerLimitRepository indexerStatusRepository;

    private BaseConfigHandler baseConfigHandler;

    private final ConcurrentHashMap<Integer, Category> idToCategory = new ConcurrentHashMap<>();

    public Newznab(ConfigProvider configProvider, IndexerRepository indexerRepository, SearchResultRepository searchResultRepository, IndexerApiAccessRepository indexerApiAccessRepository, IndexerApiAccessEntityShortRepository indexerApiAccessShortRepository, IndexerLimitRepository indexerStatusRepository, IndexerWebAccess indexerWebAccess, SearchResultAcceptor resultAcceptor, CategoryProvider categoryProvider, InfoProvider infoProvider, ApplicationEventPublisher eventPublisher, QueryGenerator queryGenerator, CustomQueryAndTitleMappingHandler titleMapping, Unmarshaller unmarshaller, BaseConfigHandler baseConfigHandler) {
        super(configProvider, indexerRepository, searchResultRepository, indexerApiAccessRepository, indexerApiAccessShortRepository, indexerStatusRepository, indexerWebAccess, resultAcceptor, categoryProvider, infoProvider, eventPublisher, queryGenerator, titleMapping, baseConfigHandler);
        this.unmarshaller = unmarshaller;
        this.indexerStatusRepository = indexerStatusRepository;
        this.baseConfigHandler = baseConfigHandler;
    }

    protected UriComponentsBuilder getBaseUri() {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(config.getHost()).path(config.getApiPath().orElse("/api"));
        if (!Strings.isNullOrEmpty(config.getApiKey())) {
            builder.queryParam("apikey", config.getApiKey());
        }
        return builder;
    }

    @Override
    protected UriComponentsBuilder buildSearchUrl(SearchRequest searchRequest, Integer offset, Integer limit) throws IndexerSearchAbortedException {
        UriComponentsBuilder componentsBuilder = getBaseUri();
        SearchType searchType = searchRequest.getSearchType();
        if (config.getSupportedSearchTypes().stream().noneMatch(x -> searchRequest.getSearchType().matches(x))) {
            searchType = SearchType.SEARCH;
        }
        if (searchRequest.getSearchType() == SearchType.MOVIE && searchRequest.getQuery().isPresent()) {
            if (searchRequest.getQuery().isPresent() && isIndexerNotSupportingMovieQSearch()) {
                debug("Switching search type to SEARCH because this indexer doesn't allow using search type MOVIE/TVSEARCH with a query");
                searchType = SearchType.SEARCH;
            }
        }
        componentsBuilder = componentsBuilder.queryParam("t", searchType.name().toLowerCase()).queryParam("extended", "1");

        String query = "";

        //Only provide search IDs when no fallback to query generation was requested
        if (searchRequest.getInternalData().getFallbackStateByIndexer(getName()) != InternalData.FallbackState.REQUESTED) {
            componentsBuilder = extendQueryUrlWithSearchIds(searchRequest, componentsBuilder);
        }
        query = generateQueryIfApplicable(searchRequest, query);
        verifyIdentifiersNotUnhandled(searchRequest, componentsBuilder, query);
        query = addRequiredAndforbiddenWordsToQuery(searchRequest, query);
        query = cleanupQuery(query);
        addFurtherParametersToUri(searchRequest, componentsBuilder, query);

        //No reason not to get as many as we can
        componentsBuilder.queryParam("limit", 1000);
        if (offset != null) {
            componentsBuilder.queryParam("offset", offset);
        }
        return componentsBuilder;
    }

    private void verifyIdentifiersNotUnhandled(SearchRequest searchRequest, UriComponentsBuilder componentsBuilder, String query) throws IndexerNoIdConversionPossibleException {
        //Make sure we didn't for some reason neither find any usable search IDs nor generate a query
        String currentUriString = componentsBuilder.toUriString();
        boolean noIdsOrIdWithNull = idTypeToParamValueMap.values().stream().noneMatch(s -> currentUriString.contains(s) && !currentUriString.contains(s + "=null"));
        if (Strings.isNullOrEmpty(query) && !searchRequest.getIdentifiers().isEmpty() && noIdsOrIdWithNull) {
            throw new IndexerNoIdConversionPossibleException("Aborting searching for indexer because no usable search IDs could be found and no query was generated");
        }
    }

    protected void addFurtherParametersToUri(SearchRequest searchRequest, UriComponentsBuilder componentsBuilder, String query) {
        if (!query.isEmpty()) {
            componentsBuilder.queryParam("q", query);
        }

        if (config.getSupportedSearchTypes().contains(ActionAttribute.TVSEARCH)) {
            if (searchRequest.getSeason().isPresent()) {
                componentsBuilder.queryParam("season", searchRequest.getSeason().get());
            }
            if (searchRequest.getEpisode().isPresent()) {
                componentsBuilder.queryParam("ep", searchRequest.getEpisode().get());
            }
        }

        if (config.getSupportedSearchTypes().contains(ActionAttribute.BOOK)) {
            if (searchRequest.getTitle().isPresent()) {
                componentsBuilder.queryParam("title", searchRequest.getTitle().get());
            }
            if (searchRequest.getAuthor().isPresent()) {
                componentsBuilder.queryParam("author", searchRequest.getAuthor().get());
            }
        }

        if (searchRequest.getMaxage().isPresent()) {
            componentsBuilder.queryParam("maxage", searchRequest.getMaxage().get());
        }

        if (searchRequest.getMinsize().isPresent()) {
            componentsBuilder.queryParam("minsize", searchRequest.getMinsize().get());
        }

        String passwordParameter = "password";
        if (config.getHost().toLowerCase().contains("omgwtf")) {
            passwordParameter = "pw";
        }

        if (!configProvider.getBaseConfig().getSearching().isIgnorePassworded() || searchRequest.getInternalData().isIncludePasswords()) {
            componentsBuilder.queryParam(passwordParameter, "1");
        } else {
            componentsBuilder.queryParam(passwordParameter, "0");
        }

        calculateAndAddCategories(searchRequest, componentsBuilder);

        config.getCustomParameters().forEach(x -> {
            final String[] split = x.split("=");
            componentsBuilder.queryParam(split[0], split[1]);
        });

    }

    protected void calculateAndAddCategories(SearchRequest searchRequest, UriComponentsBuilder componentsBuilder) {
        if (config.getCategoryMapping() == null) {
            error("Category mapping unknown - caps check incomplete?");
        }
        List<Integer> categoryIds = new ArrayList<>();
        if (searchRequest.getInternalData().getNewznabCategories().isEmpty() || configProvider.getBaseConfig().getSearching().isTransformNewznabCategories()) {
            if (searchRequest.getCategory().getSubtype() == Subtype.ANIME && config.getCategoryMapping().getAnime().isPresent()) {
                categoryIds = Arrays.asList(config.getCategoryMapping().getAnime().get());
            } else if (searchRequest.getCategory().getSubtype() == Subtype.AUDIOBOOK && config.getCategoryMapping().getAudiobook().isPresent()) {
                categoryIds = Arrays.asList(config.getCategoryMapping().getAudiobook().get());
            } else if (searchRequest.getCategory().getSubtype() == Subtype.COMIC && config.getCategoryMapping().getComic().isPresent()) {
                categoryIds = Arrays.asList(config.getCategoryMapping().getComic().get());
            } else if (searchRequest.getCategory().getSubtype() == Subtype.EBOOK && config.getCategoryMapping().getEbook().isPresent()) {
                categoryIds = Arrays.asList(config.getCategoryMapping().getEbook().get());
            } else if (searchRequest.getCategory().getSubtype() == Subtype.MAGAZINE && config.getCategoryMapping().getMagazine().isPresent()) {
                categoryIds = Arrays.asList(config.getCategoryMapping().getMagazine().get());
            } else if (!searchRequest.getCategory().getNewznabCategories().isEmpty()) {
                categoryIds = searchRequest.getCategory().getNewznabCategories().stream().flatMap(Collection::stream).collect(Collectors.toList());
            }
            categoryIds = new ArrayList<>(categoryIds); //Arrays.asList() returns an unmodifiable list which will not be sortable
        } else {
            categoryIds = new ArrayList<>(searchRequest.getInternalData().getNewznabCategories()); //Use new instance of list to be sorted
        }
        if (categoryIds.isEmpty() && searchRequest.getCategory() == CategoriesConfig.allCategory && !searchRequest.getInternalData().getNewznabCategories().isEmpty()) {
            //Provided categories could not be mapped to a specific category - use them
            categoryIds = new ArrayList<>(searchRequest.getInternalData().getNewznabCategories()); //Use new instance of list to be sorted
        }
        if (!categoryIds.isEmpty()) {
            Collections.sort(categoryIds);
            componentsBuilder.queryParam("cat", Joiner.on(",").join(categoryIds));
        }

    }

    private boolean isIndexerNotSupportingMovieQSearch() {
        return HOSTS_NOT_SUPPORTING_MOVIE_Q_SEARCH.stream().anyMatch(x -> getConfig().getHost().toLowerCase().contains(x));
    }

    protected boolean isSwitchToTSearchNeeded(SearchRequest request) {
        return false;
    }

    protected String addRequiredAndforbiddenWordsToQuery(SearchRequest searchRequest, String query) {
        if (Strings.isNullOrEmpty(query)) {
            //Indexers do not allow having a query that only contains forbidden words
            return query;
        }
        query = addRequiredWords(searchRequest, query);

        return addForbiddenWords(searchRequest, query);
    }

    protected String addForbiddenWords(SearchRequest searchRequest, String query) {
        if (config.getForbiddenWordPrefix() == IndexerConfig.ForbiddenWordPrefix.UNKNOWN) {
            info("Forbidden word prefix unknown - running check to determine it");
            //Horrible but easier...
            config.setForbiddenWordPrefix(NzbHydra.getApplicationContext().getAutowireCapableBeanFactory().getBean(IndexerChecker.class).determineForbiddenWordPrefix(config));
            baseConfigHandler.save(false);
        }
        if (config.getForbiddenWordPrefix() == IndexerConfig.ForbiddenWordPrefix.UNSUPPORTED) {
            debug("Not adding forbidden words as this indexer doesn't support them.");
            return query;
        }
        List<String> allForbiddenWords = new ArrayList<>(searchRequest.getInternalData().getForbiddenWords());
        allForbiddenWords.addAll(configProvider.getBaseConfig().getSearching().getForbiddenWords());
        allForbiddenWords.addAll(searchRequest.getCategory().getForbiddenWords());
        List<String> allPossibleForbiddenWords = allForbiddenWords.stream().filter(x -> !(x.contains(" ") || x.contains("-") || x.contains("."))).collect(Collectors.toList());
        if (allForbiddenWords.size() > allPossibleForbiddenWords.size()) {
            debug("Not using some forbidden words in query because characters forbidden by newznab are contained.");
        }
        if (!allPossibleForbiddenWords.isEmpty()) {
            if (config.getForbiddenWordPrefix() == IndexerConfig.ForbiddenWordPrefix.EXCLAMATION_MARK) {
                query += (query.isEmpty() ? "" : " ") + "!" + Joiner.on(",!").join(allPossibleForbiddenWords);
            } else if (config.getForbiddenWordPrefix() == IndexerConfig.ForbiddenWordPrefix.DOUBLE_DASH) {
                query += (query.isEmpty() ? "" : " ") + "--" + Joiner.on(" --").join(allPossibleForbiddenWords);
            }
        }
        return query;
    }

    protected String addRequiredWords(SearchRequest searchRequest, String query) {
        List<String> allRequiredWords = new ArrayList<>(searchRequest.getInternalData().getRequiredWords());
        allRequiredWords.addAll(configProvider.getBaseConfig().getSearching().getRequiredWords());
        allRequiredWords.addAll(searchRequest.getCategory().getRequiredWords());
        List<String> allPossibleRequiredWords = allRequiredWords.stream().filter(x -> !(x.contains(" ") || x.contains("-") || x.contains("."))).collect(Collectors.toList());
        if (allRequiredWords.size() > allPossibleRequiredWords.size()) {
            debug("Not using some forbidden words in query because characters forbidden by newznab are contained");
        }
        if (!allPossibleRequiredWords.isEmpty()) {
            query += (query.isEmpty() ? "" : " ") + Joiner.on(" ").join(allPossibleRequiredWords);
        }
        return query;
    }

    protected UriComponentsBuilder extendQueryUrlWithSearchIds(SearchRequest searchRequest, UriComponentsBuilder componentsBuilder) {
        if (!searchRequest.getIdentifiers().isEmpty()) {
            Map<MediaIdType, String> params = new HashMap<>();
            boolean idConversionNeeded = isIdConversionNeeded(searchRequest);
            if (idConversionNeeded) {
                debug("Will try to convert IDs if possible");
                boolean canConvertAnyId = infoProvider.canConvertAny(searchRequest.getIdentifiers().keySet(), new HashSet<>(config.getSupportedSearchIds()));
                if (canConvertAnyId) {
                    debug("Can convert any of provided IDs {} to at least one of supported IDs {}", searchRequest.getIdentifiers().keySet(), config.getSupportedSearchIds());
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
                        debug("Available search IDs: {}", params);
                    } catch (InfoProviderException e) {
                        error("Error while converting search ID", e);
                    }
                } else {
                    final String supportedSearchIds = config.getSupportedSearchIds().isEmpty() ? "[]" : Joiner.on(", ").join(config.getSupportedSearchIds());
                    debug("Unable to convert any of the provided IDs to any of these supported IDs: {}", supportedSearchIds);
                }
                if (params.isEmpty()) {
                    warn("Didn't find any usable IDs to add to search request");
                }
            }

            //Don't overwrite IDs provided by the calling instance, only add missing ones
            params.forEach((key, value) -> searchRequest.getIdentifiers().putIfAbsent(key, value));
            if (searchRequest.getSearchType() == SearchType.TVSEARCH) {
                //IMDB is not the same as TVIMDB
                searchRequest.getIdentifiers().remove(MediaIdType.IMDB);
            }

            for (Map.Entry<MediaIdType, String> entry : searchRequest.getIdentifiers().entrySet()) {
                //We just add all IDs that we have (if the indexer supports them). Some indexers will find results under one ID but not the other
                if (entry.getValue() == null) {
                    continue;
                }
                if (!config.getSupportedSearchIds().contains(entry.getKey())) {
                    continue;
                }
                debug("Using media ID {}={}", entry.getKey(), entry.getValue());
                componentsBuilder.queryParam(idTypeToParamValueMap.get(entry.getKey()), entry.getValue().replace("tt", ""));
            }

        }
        return componentsBuilder;
    }

    private boolean isIdConversionNeeded(SearchRequest searchRequest) {
        final boolean indexerNeedsConversion = searchRequest.getIdentifiers().keySet().stream().noneMatch(x -> searchRequest.getIdentifiers().get(x) != null && config.getSupportedSearchIds().contains(x));
        if (indexerNeedsConversion) {
            debug("Indexer doesn't support any of the provided search IDs: {}", Joiner.on(", ").join(searchRequest.getIdentifiers().keySet()));
            return true;
        }
        if (searchRequest.getSource().meets(configProvider.getBaseConfig().getSearching().getAlwaysConvertIds())) {
            debug("Will convert IDs as ID conversion is to be always done for {}", configProvider.getBaseConfig().getSearching().getAlwaysConvertIds());
            return true;
        }
        return false;
    }

    protected Xml getAndStoreResultToDatabase(URI uri, IndexerApiAccessType apiAccessType) throws IndexerAccessException {
        Xml response = getAndStoreResultToDatabase(uri, Xml.class, apiAccessType);
        if (response instanceof NewznabXmlError) {
            //Base class doesn't know any RssErrors so we must handle this case specially
            handleRssError((NewznabXmlError) response, uri.toString());
        } else if (!(response instanceof NewznabXmlRoot)) {
            throw new UnknownResponseException("Indexer returned unknown response");
        }
        return response;
    }


    @Override
    public NfoResult getNfo(String guid) {
        UriComponentsBuilder baseUri = getBaseUri().queryParam("raw", "1").queryParam("id", guid);
        if (config.getBackend() == BackendType.NZEDB || config.getBackend() == BackendType.NNTMUX) {
            baseUri.queryParam("t", "info");
        } else {
            baseUri.queryParam("t", "getnfo");
        }
        String result;
        try {
            result = getAndStoreResultToDatabase(baseUri.build().toUri(), String.class, IndexerApiAccessType.NFO);
        } catch (IndexerAccessException e) {
            return NfoResult.unsuccessful(e.getMessage());
        }
        if (!result.contains("<?xml")) {
            return NfoResult.withNfo(result);
        }
        try {
            Xml xml = (Xml) unmarshaller.unmarshal(new StreamSource(new StringReader(result)));
            if (xml instanceof NewznabXmlError) {
                handleRssError((NewznabXmlError) xml, baseUri.toUriString());
            }
            NewznabXmlRoot rssRoot = (NewznabXmlRoot) xml;
            if (rssRoot.getRssChannel().getNewznabResponse() == null || rssRoot.getRssChannel().getNewznabResponse().getTotal() == 0) {
                return NfoResult.withoutNfo();
            }
            return NfoResult.withNfo(rssRoot.getRssChannel().getItems().get(0).getDescription());
        } catch (IOException | IndexerAccessException e) {
            error("Error while getting NFO: " + e.getMessage());
            return NfoResult.unsuccessful(e.getMessage());
        }
    }

    @Override
    public DetailsResult getDetails(String guid, long searchResultId) throws IndexerAccessException {
        UriComponentsBuilder baseUri = getBaseUri().queryParam("t", "details").queryParam("id", guid);
        Xml xml;
        try {
            xml = getAndStoreResultToDatabase(baseUri.build().toUri(), IndexerApiAccessType.DETAILS);
        } catch (IndexerAccessException e) {
            return DetailsResult.unsuccessful(e.getMessage());
        }
        if (xml instanceof NewznabXmlError) {
            handleRssError((NewznabXmlError) xml, baseUri.toUriString());
        }
        NewznabXmlRoot rssRoot = (NewznabXmlRoot) xml;
        List<SearchResultItem> searchResultItems = getSearchResultItems(rssRoot, new SearchRequest());
        if (searchResultItems.size() != 1) {
            return DetailsResult.unsuccessful("Didn't find exactly one result for ID");
        }
        SearchResultItem item = searchResultItems.get(0);
        item.setSearchResultId(searchResultId);
        return DetailsResult.withItem(item);
    }

    protected void handleRssError(NewznabXmlError response, String url) throws IndexerAccessException {
        if (Stream.of("100", "101", "102").anyMatch(x -> x.equals(response.getCode())) && !(response.getDescription() != null && response.getDescription().contains("Hits Limit Reached"))) {
            throw new IndexerAuthException(String.format("Indexer refused authentication. Error code: %s. Description: %s", response.getCode(), response.getDescription()));
        }
        if (Stream.of("200", "201", "202", "203").anyMatch(x -> x.equals(response.getCode()))) {
            throw new IndexerProgramErrorException(String.format("Indexer returned error code %s and description '%s' when URL %s was called", response.getCode(), response.getDescription(), url));
        }
        throw new IndexerErrorCodeException(response);
    }

    @Override
    protected List<SearchResultItem> getSearchResultItems(Xml rssRoot, SearchRequest searchRequest) {
        List<SearchResultItem> searchResultItems = new ArrayList<>();

        final NewznabXmlRoot newznabXmlRoot = (NewznabXmlRoot) rssRoot;
        checkForTooManyResults(searchRequest, newznabXmlRoot);

        for (NewznabXmlItem item : newznabXmlRoot.getRssChannel().getItems()) {
            try {
                if (config.getSearchModuleType() == SearchModuleType.TORZNAB && item.getEnclosures().stream().noneMatch(x -> Objects.equals(x.getType(), "application/x-bittorrent"))) {
                    debug("Skipping result {} because it doesn't contain a torrent link", item.getTitle());
                    continue;
                }
                if (config.getSearchModuleType() == SearchModuleType.NEWZNAB && item.getEnclosures().stream().noneMatch(x -> Objects.equals(x.getType(), "application/x-nzb"))) {
                    debug("Skipping result {} because it doesn't contain an NZB link", item.getTitle());
                    continue;
                }
                SearchResultItem searchResultItem = createSearchResultItem(item);
                searchResultItems.add(searchResultItem);
            } catch (NzbHydraException e) {
                //Already logged
            }
        }

        return searchResultItems;
    }

    private void checkForTooManyResults(SearchRequest searchRequest, NewznabXmlRoot newznabXmlRoot) {
        if (newznabXmlRoot.getRssChannel().getNewznabResponse() != null) { //is null for torznab
            final Integer total = newznabXmlRoot.getRssChannel().getNewznabResponse().getTotal();
            if (searchRequest.isIdBasedQuery() && !searchRequest.getInternalData().isQueryGenerated() && total >= 10_000) {
                warn("Indexer returned " + total + " results for an ID based searched. Will interpret this as no results found");
                newznabXmlRoot.getRssChannel().getNewznabResponse().setTotal(0);
                newznabXmlRoot.getRssChannel().getItems().clear();
            }
        }
    }

    protected void completeIndexerSearchResult(Xml response, IndexerSearchResult indexerSearchResult, AcceptorResult acceptorResult, SearchRequest searchRequest, int offset, Integer limit) {
        NewznabXmlChannel rssChannel = ((NewznabXmlRoot) response).getRssChannel();
        NewznabXmlResponse newznabResponse = rssChannel.getNewznabResponse();
        final int actualNumberResults = indexerSearchResult.getSearchResultItems().size();
        if (newznabResponse != null) {
            indexerSearchResult.setTotalResultsKnown(true);
            if (newznabResponse.getTotal() != null) { //If an indexer doesn't provide a total number of results
                indexerSearchResult.setTotalResults(newznabResponse.getTotal());
                indexerSearchResult.setHasMoreResults(newznabResponse.getTotal() > newznabResponse.getOffset() + actualNumberResults + acceptorResult.getNumberOfRejectedResults());
            } else {
                indexerSearchResult.setTotalResults(actualNumberResults);
                indexerSearchResult.setHasMoreResults(false);
            }
            indexerSearchResult.setOffset(newznabResponse.getOffset());
            indexerSearchResult.setPageSize(((NewznabXmlRoot) response).getRssChannel().getItems().size());
        } else {
            indexerSearchResult.setTotalResultsKnown(false);
            indexerSearchResult.setHasMoreResults(false);
            indexerSearchResult.setOffset(0);
            indexerSearchResult.setPageSize(0);
        }
        if (indexerSearchResult.getTotalResults() == 0) {
            //Fallback to make sure the total is not 0 when actually some results were reported
            indexerSearchResult.setTotalResults(actualNumberResults);
        }
        checkForInvalidTotal(indexerSearchResult, rssChannel);

        final NewznabXmlApilimits apiLimits = rssChannel.getApiLimits();
        if (apiLimits != null) {

            IndexerLimit indexerStatus = indexerStatusRepository.findByIndexer(indexer);
            indexerStatus.setApiHits(apiLimits.getApiCurrent() != null ? apiLimits.getApiCurrent() + 1 : null);
            indexerStatus.setApiHitLimit(apiLimits.getApiMax());
            indexerStatus.setDownloads(apiLimits.getGrabCurrent());
            indexerStatus.setDownloadLimit(apiLimits.getGrabMax());
            indexerStatus.setOldestApiHit(apiLimits.getApiOldestTime());
            indexerStatus.setOldestDownload(apiLimits.getGrabOldestTime());

            indexerStatusRepository.save(indexerStatus);
            debug(LoggingMarkers.LIMITS, "Indexer {}. Saving IndexerStatus data: {}", indexer.getName(), indexerStatus);

        } else {
            debug(LoggingMarkers.LIMITS, "Indexer {}. No limits provided in response.", indexer.getName());
        }

    }

    private void checkForInvalidTotal(IndexerSearchResult indexerSearchResult, NewznabXmlChannel rssChannel) {
        final int newznabItemsCount = rssChannel.getItems().size();
        final NewznabXmlResponse newznabResponse = rssChannel.getNewznabResponse();
        if (newznabResponse == null || newznabResponse.getTotal() == null) {
            return;
        }
        final int newznabTotal = newznabResponse.getTotal();
        int offset = newznabResponse.getOffset();
        //if an indexer returns less results in one page than its total number of results then the indexer misbehaves. But if we request more results than the indexer allows per page then this isn't an error
        if (offset == 0 && newznabItemsCount < newznabTotal && newznabItemsCount < 100) {
            warn("Indexer's response indicates a total of " + newznabTotal + " results but actually only " + newznabItemsCount + " were returned");
            indexerSearchResult.setTotalResults(newznabItemsCount);
            indexerSearchResult.setHasMoreResults(false);
        }
    }

    protected SearchResultItem createSearchResultItem(NewznabXmlItem item) throws NzbHydraException {
        SearchResultItem searchResultItem = new SearchResultItem();
        String link = getEnclosureUrl(item);
        searchResultItem.setLink(link);

        String guid = item.getRssGuid().getGuid();
        if (item.getRssGuid().isPermaLink()) {
            searchResultItem.setDetails(guid);
            int index = guid.lastIndexOf("id=");
            if (index > -1) {
                guid = guid.substring(index + 3);
            } else {
                index = guid.lastIndexOf("/");
                guid = guid.substring(index + 1);
                index = guid.indexOf("#");
                if (index > -1) {
                    guid = guid.substring(0, index);
                }
            }
            searchResultItem.setIndexerGuid(guid);
        } else {
            searchResultItem.setIndexerGuid(guid);
        }

        if (!Strings.isNullOrEmpty(item.getComments()) && Strings.isNullOrEmpty(searchResultItem.getDetails())) {
            searchResultItem.setDetails(item.getComments().replace("#comments", ""));
        }

        //LATER If details link still not set build it using the GUID which is sure to be not a link at this point. Perhaps this isn't necessary because all indexers should have a comments link

        searchResultItem.setFirstFound(Instant.now());
        searchResultItem.setIndexer(this);
        searchResultItem.setTitle(cleanUpTitle(item.getTitle()));
        searchResultItem.setSize(item.getEnclosure().getLength());
        searchResultItem.setPubDate(item.getPubDate());
        searchResultItem.setIndexerScore(config.getScore());
        searchResultItem.setGuid(SearchResultIdCalculator.calculateSearchResultId(searchResultItem));
        searchResultItem.setAgePrecise(true);
        searchResultItem.setDescription(item.getDescription());
        searchResultItem.setDownloadType(DownloadType.NZB);
        searchResultItem.setCommentsLink(item.getComments());
        searchResultItem.setOriginalCategory(item.getCategory()); //May be overwritten by mapping in attributes
        parseAttributes(item, searchResultItem);


        return searchResultItem;
    }

    protected String getEnclosureUrl(NewznabXmlItem item) throws NzbHydraException {
        String link;
        if (item.getEnclosures().size() == 0) {
            link = item.getEnclosures().get(0).getUrl();
        } else {
            Optional<NewznabXmlEnclosure> nzbEnclosure = item.getEnclosures().stream().filter(x -> getEnclosureType().equals(x.getType())).findAny();
            if (nzbEnclosure.isEmpty()) {
                warn("Unable to find URL for result " + item.getTitle() + ". Will skip it.");
                throw new NzbHydraException();
            }
            link = nzbEnclosure.get().getUrl();
        }
        return link;
    }

    protected String getEnclosureType() {
        return "application/x-nzb";
    }

    protected void parseAttributes(NewznabXmlItem item, SearchResultItem searchResultItem) {
        Map<String, String> attributes = item.getNewznabAttributes().stream().collect(Collectors.toMap(NewznabAttribute::getName, NewznabAttribute::getValue, (a, b) -> b));
        List<Integer> newznabCategories = item.getNewznabAttributes().stream().filter(x -> x.getName().equals("category") && !"None".equals(x.getValue()) && !Strings.isNullOrEmpty(x.getValue())).map(newznabAttribute -> Integer.parseInt(newznabAttribute.getValue())).collect(Collectors.toList());
        searchResultItem.setAttributes(attributes);

        if (attributes.containsKey("usenetdate")) {
            tryParseDate(attributes.get("usenetdate")).ifPresent(searchResultItem::setUsenetDate);
        }
        if (attributes.containsKey("password")) {
            String passwordValue = attributes.get("password");
            try {
                if (Integer.parseInt(passwordValue) > 0) {
                    searchResultItem.setPassworded(true);
                }
            } catch (NumberFormatException e) {
                searchResultItem.setPassworded(true);
            }
        }
        if (attributes.containsKey("nfo")) {
            searchResultItem.setHasNfo(attributes.get("nfo").equals("1") ? HasNfo.YES : HasNfo.NO);
        }
        if (attributes.containsKey("info") && (config.getBackend() == BackendType.NNTMUX || config.getBackend() == BackendType.NZEDB)) {
            //Info attribute is always a link to an NFO
            searchResultItem.setHasNfo(HasNfo.YES);
        }
        Arrays.asList("coverurl", "cover").forEach(x -> {
            if (attributes.containsKey(x) && !attributes.get(x).equals("not available") && !attributes.get(x).equals("no-cover") && (attributes.get(x).toLowerCase().endsWith(".jpg") || attributes.get(x).toLowerCase().endsWith(".jpeg") || attributes.get(x).toLowerCase().endsWith(".png"))) {
                searchResultItem.setCover(attributes.get(x));
            }
        });
        if (attributes.containsKey("poster") && !attributes.get("poster").equals("not available")) {
            searchResultItem.setPoster(attributes.get("poster"));
        }
        if (attributes.containsKey("group") && !attributes.get("group").equals("not available")) {
            searchResultItem.setGroup(attributes.get("group"));
        }
        if (attributes.containsKey("files")) {
            searchResultItem.setFiles(Integer.valueOf(attributes.get("files")));
        }
        if (attributes.containsKey("comments")) {
            searchResultItem.setCommentsCount(Integer.valueOf(attributes.get("comments")));
        }
        if (attributes.containsKey("grabs")) {
            searchResultItem.setGrabs(Integer.valueOf(attributes.get("grabs")));
        }
        if (attributes.containsKey("guid")) {
            searchResultItem.setIndexerGuid(attributes.get("guid"));
        }
        if (attributes.containsKey("size")) {
            searchResultItem.setSize(Long.valueOf(attributes.get("size")));
        }
        if (attributes.containsKey("source")) {
            searchResultItem.setSource(attributes.get("source"));
        }

        computeCategory(searchResultItem, newznabCategories);

        if (searchResultItem.getHasNfo() == HasNfo.MAYBE && (config.getBackend() == BackendType.NNTMUX || config.getBackend() == BackendType.NZEDB)) {
            //For these backends if not specified it doesn't exist
            searchResultItem.setHasNfo(HasNfo.NO);
        }
        if (searchResultItem.getGroup().isEmpty() && !Strings.isNullOrEmpty(item.getDescription()) && item.getDescription().contains("Group:")) {
            //Dog has the group in the description, perhaps others too
            Matcher matcher = GROUP_PATTERN.matcher(item.getDescription());
            if (matcher.matches() && !Objects.equals(matcher.group(1), "not available")) {
                searchResultItem.setGroup(matcher.group(1));
            }
        }

        try {
            if (searchResultItem.getCategory().getSearchType() == SearchType.TVSEARCH) {
                if (searchResultItem.getAttributes().containsKey("season")) {
                    searchResultItem.getAttributes().put("season", searchResultItem.getAttributes().get("season").replaceAll("[sS]", ""));
                }
                if (searchResultItem.getAttributes().containsKey("episode")) {
                    searchResultItem.getAttributes().put("episode", searchResultItem.getAttributes().get("episode").replaceAll("[eE]", ""));
                }
                if (searchResultItem.getAttributes().containsKey("showtitle")) {
                    searchResultItem.getAttributes().put("showtitle", searchResultItem.getAttributes().get("showtitle"));
                }

                if (!attributes.containsKey("season") || !attributes.containsKey("episode") || !attributes.containsKey("showtitle")) {
                    Matcher matcher = TV_PATTERN.matcher(item.getTitle());
                    if (matcher.find()) {
                        putGroupMatchIfFound(searchResultItem, matcher, "season", "season");
                        putGroupMatchIfFound(searchResultItem, matcher, "season2", "season");
                        putGroupMatchIfFound(searchResultItem, matcher, "episode", "episode");
                        putGroupMatchIfFound(searchResultItem, matcher, "episode2", "episode");
                        putGroupMatchIfFound(searchResultItem, matcher, "showtitle", "showtitle");
                    }
                }
                if (attributes.containsKey("season")) {
                    attributes.put("season", tryParseInt(attributes.get("season").replaceAll("\\D", "").toLowerCase()));
                }
                if (attributes.containsKey("episode")) {
                    attributes.put("episode", tryParseInt(attributes.get("episode").replaceAll("\\D", "").toLowerCase()));
                }
                if (attributes.containsKey("showtitle")) {
                    attributes.put("showtitle", attributes.get("showtitle").replaceAll("\\W", "").toLowerCase());
                }
            }
        } catch (NumberFormatException e) {
            //Daily release or such, just ignore
        }


    }

    private String tryParseInt(String string) {
        try {
            return String.valueOf(Integer.valueOf(string));
        } catch (NumberFormatException e) {
            return string;
        }
    }

    private void putGroupMatchIfFound(SearchResultItem searchResultItem, Matcher matcher, String groupName, String attributeName) {
        if (matcher.group(groupName) != null && !searchResultItem.getAttributes().containsKey(attributeName)) {
            searchResultItem.getAttributes().put(attributeName, matcher.group(groupName));
        }
    }

    protected void computeCategory(SearchResultItem searchResultItem, List<Integer> newznabCategories) {
        if (!newznabCategories.isEmpty()) {
            debug(LoggingMarkers.CATEGORY_MAPPING, "Result {} has newznab categories {} and self-reported category {}", searchResultItem.getTitle(), newznabCategories, searchResultItem.getCategory());
            Integer mostSpecific = newznabCategories.stream().max(Integer::compareTo).get();
            IndexerCategoryConfig mapping = config.getCategoryMapping();
            Category category;
            if (mapping == null) { //May be the case in some corner cases
                category = categoryProvider.fromSearchNewznabCategories(newznabCategories, categoryProvider.getNotAvailable());
                searchResultItem.setOriginalCategory(categoryProvider.getNotAvailable().getName());
                debug(LoggingMarkers.CATEGORY_MAPPING, "No mapping available. Using original category N/A and new category {} for result {}", category, searchResultItem.getTitle());
            } else {
                category = idToCategory.computeIfAbsent(mostSpecific, x -> {
                    Optional<Category> categoryOptional = Optional.empty();
                    if (mapping.getAnime().isPresent() && Objects.equals(mapping.getAnime().get(), mostSpecific)) {
                        categoryOptional = categoryProvider.fromSubtype(Subtype.ANIME);
                    } else if (mapping.getAudiobook().isPresent() && Objects.equals(mapping.getAudiobook().get(), mostSpecific)) {
                        categoryOptional = categoryProvider.fromSubtype(Subtype.AUDIOBOOK);
                    } else if (mapping.getEbook().isPresent() && Objects.equals(mapping.getEbook().get(), mostSpecific)) {
                        categoryOptional = categoryProvider.fromSubtype(Subtype.EBOOK);
                    } else if (mapping.getComic().isPresent() && Objects.equals(mapping.getComic().get(), mostSpecific)) {
                        categoryOptional = categoryProvider.fromSubtype(Subtype.COMIC);
                    } else if (mapping.getMagazine().isPresent() && Objects.equals(mapping.getMagazine().get(), mostSpecific)) {
                        categoryOptional = categoryProvider.fromSubtype(Subtype.MAGAZINE);
                    }
                    return categoryOptional.orElse(categoryProvider.fromResultNewznabCategories(newznabCategories));
                });
                //Use the indexer's own category mapping to build the category name
                searchResultItem.setOriginalCategory(mapping.getNameFromId(mostSpecific));
            }
            if (category == null) {
                debug(LoggingMarkers.CATEGORY_MAPPING, "No category found for {}. Using N/A", searchResultItem.getTitle());
                searchResultItem.setCategory(categoryProvider.getNotAvailable());
            } else {
                debug(LoggingMarkers.CATEGORY_MAPPING, "Determined category {} for {}", category, searchResultItem.getTitle());
                searchResultItem.setCategory(category);
            }
        } else {
            debug(LoggingMarkers.CATEGORY_MAPPING, "No newznab categories exist for {}. Using N/A", searchResultItem.getTitle());
            searchResultItem.setCategory(categoryProvider.getNotAvailable());
        }
    }

    protected Logger getLogger() {
        return logger;
    }

    @Component
    @Order(500)
    public static class NewznabHandlingStrategy implements IndexerHandlingStrategy<Newznab> {

        @Override
        public boolean handlesIndexerConfig(IndexerConfig config) {
            return config.getSearchModuleType() == SearchModuleType.NEWZNAB;
        }

        @Override
        public String getName() {
            return "NEWZNAB";
        }


    }


}
