package org.nzbhydra.indexers;

import com.google.common.base.Joiner;
import com.google.common.base.Strings;
import lombok.Getter;
import lombok.Setter;
import org.nzbhydra.config.Category;
import org.nzbhydra.config.Category.Subtype;
import org.nzbhydra.config.IndexerCategoryConfig;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.config.SearchModuleType;
import org.nzbhydra.indexers.exceptions.*;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mapping.newznab.xml.*;
import org.nzbhydra.mediainfo.InfoProvider.IdType;
import org.nzbhydra.mediainfo.InfoProviderException;
import org.nzbhydra.mediainfo.MediaInfo;
import org.nzbhydra.searching.*;
import org.nzbhydra.searching.SearchResultAcceptor.AcceptorResult;
import org.nzbhydra.searching.SearchResultItem.DownloadType;
import org.nzbhydra.searching.SearchResultItem.HasNfo;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.annotation.Order;
import org.springframework.oxm.Unmarshaller;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import javax.xml.transform.stream.StreamSource;
import java.io.IOException;
import java.io.StringReader;
import java.net.URI;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Getter
@Setter
@Component
public class Newznab extends Indexer<Xml> {

    private static final Logger logger = LoggerFactory.getLogger(Newznab.class);

    static Map<IdType, String> idTypeToParamValueMap = new HashMap<>();
    public static Map<String, IdType> paramValueToIdMap = new HashMap<>();

    private static final List<String> LANGUAGES = Arrays.asList(" English", " Korean", " Spanish", " French", " German", " Italian", " Danish", " Dutch", " Japanese", " Cantonese", " Mandarin", " Russian", " Polish", " Vietnamese", " Swedish", " Norwegian", " Finnish", " Turkish", " Portuguese", " Flemish", " Greek", " Hungarian");
    private static Pattern GROUP_PATTERN = Pattern.compile(".*Group:<\\/b> ?([\\w\\.]+)<br ?\\/>.*");
    private static Pattern GUID_PATTERN = Pattern.compile("(.*\\/)?([a-zA-Z0-9@\\.]+)(#\\w+)?");


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
    private Unmarshaller unmarshaller;
    private ConcurrentHashMap<Integer, Category> idToCategory = new ConcurrentHashMap<>();


    protected UriComponentsBuilder getBaseUri() {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(config.getHost()).path("/api");
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
        if (searchRequest.getSearchType() == SearchType.MOVIE && searchRequest.getIdentifiers().isEmpty()) {
            debug("Switching search type to SEARCH because some indexers don't allow using search type MOVIE without identifiers");
            searchType = SearchType.SEARCH;
            //Don't change the category, should always be set anyway
        }
        componentsBuilder = componentsBuilder.queryParam("t", searchType.name().toLowerCase()).queryParam("extended", "1");

        String query = "";

        componentsBuilder = extendQueryUrlWithSearchIds(searchRequest, componentsBuilder);
        query = generateQueryIfApplicable(searchRequest, query);
        query = addRequiredAndforbiddenWordsToQuery(searchRequest, query);

        query = cleanupQuery(query);
        addFurtherParametersToUri(searchRequest, componentsBuilder, query);

        if (limit != null) {
            componentsBuilder.queryParam("limit", limit);
        }
        if (offset != null) {
            componentsBuilder.queryParam("offset", offset);
        }
        return componentsBuilder;
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

        if (configProvider.getBaseConfig().getSearching().isIgnorePassworded()) {
            componentsBuilder.queryParam("password", "0");
        }


        List<Integer> categoryIds = new ArrayList<>();
        if (searchRequest.getInternalData().getNewznabCategories().isEmpty()) {
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
                categoryIds = searchRequest.getCategory().getNewznabCategories();
            }
            categoryIds = new ArrayList<>(categoryIds); //Arrays.asList() returns an unmodifiable list which will not be sortable
        } else {
            categoryIds = new ArrayList<>(searchRequest.getInternalData().getNewznabCategories()); //Use new instance of list to be sorted
        }
        if (!categoryIds.isEmpty()) {
            Collections.sort(categoryIds);
            componentsBuilder.queryParam("cat", Joiner.on(",").join(categoryIds));
        }

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
        List<String> allForbiddenWords = new ArrayList<>(searchRequest.getInternalData().getForbiddenWords());
        allForbiddenWords.addAll(configProvider.getBaseConfig().getSearching().getForbiddenWords());
        allForbiddenWords.addAll(searchRequest.getCategory().getForbiddenWords());
        List<String> allPossibleForbiddenWords = allForbiddenWords.stream().filter(x -> !(x.contains(" ") || x.contains("-") || x.contains("."))).collect(Collectors.toList());
        if (allForbiddenWords.size() > allPossibleForbiddenWords.size()) {
            logger.debug("Not using some forbidden words in query because characters forbidden by newznab are contained");
        }
        if (!allPossibleForbiddenWords.isEmpty()) {
            if (config.getBackend().equals(BackendType.NZEDB) || config.getBackend().equals(BackendType.NNTMUX) || config.getHost().toLowerCase().contains("omgwtf")) {
                query += (query.isEmpty() ? "" : " ") + "!" + Joiner.on(",!").join(allPossibleForbiddenWords);
            } else {
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
            logger.debug("Not using some forbidden words in query because characters forbidden by newznab are contained");
        }
        if (!allPossibleRequiredWords.isEmpty()) {
            query += (query.isEmpty() ? "" : " ") + Joiner.on(" ").join(allPossibleRequiredWords);
        }
        return query;
    }

    protected UriComponentsBuilder extendQueryUrlWithSearchIds(SearchRequest searchRequest, UriComponentsBuilder componentsBuilder) throws IndexerSearchAbortedException {
        if (!searchRequest.getIdentifiers().isEmpty()) {
            Map<IdType, String> params = new HashMap<>();
            boolean indexerSupportsAnyOfTheProvidedIds = searchRequest.getIdentifiers().keySet().stream().anyMatch(x -> config.getSupportedSearchIds().contains(x));
            if (!indexerSupportsAnyOfTheProvidedIds) {
                boolean canConvertAnyId = infoProvider.canConvertAny(searchRequest.getIdentifiers().keySet(), new HashSet<>(config.getSupportedSearchIds()));
                if (canConvertAnyId) {
                    try {
                        MediaInfo info = infoProvider.convert(searchRequest.getIdentifiers());
                        if (info.getImdbId().isPresent()) {
                            params.put(IdType.IMDB, info.getImdbId().get().replace("tt", ""));
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
            searchRequest.getIdentifiers().putAll(params);

            for (Map.Entry<IdType, String> entry : searchRequest.getIdentifiers().entrySet()) {
                //We just add all IDs that we have. Some indexers support more than they say or will find results under one ID but not the other
                if (entry.getValue() == null) {
                    continue;
                }
                componentsBuilder.queryParam(idTypeToParamValueMap.get(entry.getKey()), entry.getValue().replace("tt", ""));
            }

        }
        return componentsBuilder;
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
    protected List<SearchResultItem> getSearchResultItems(Xml rssRoot) {
        List<SearchResultItem> searchResultItems = new ArrayList<>();

        for (NewznabXmlItem item : ((NewznabXmlRoot) rssRoot).getRssChannel().getItems()) {
            SearchResultItem searchResultItem = createSearchResultItem(item);
            searchResultItems.add(searchResultItem);
        }

        return searchResultItems;
    }

    protected void completeIndexerSearchResult(Xml response, IndexerSearchResult indexerSearchResult, AcceptorResult acceptorResult, SearchRequest searchRequest, int offset, Integer limit) {
        NewznabXmlResponse newznabResponse = ((NewznabXmlRoot) response).getRssChannel().getNewznabResponse();
        if (newznabResponse != null) {
            indexerSearchResult.setTotalResultsKnown(true);
            if (newznabResponse.getTotal() != null) { //Animetosho doesn't provide a total number of results
                indexerSearchResult.setTotalResults(newznabResponse.getTotal());
                indexerSearchResult.setHasMoreResults(newznabResponse.getTotal() > newznabResponse.getOffset() + indexerSearchResult.getSearchResultItems().size() + acceptorResult.getNumberOfRejectedResults());
            } else {
                indexerSearchResult.setTotalResults(indexerSearchResult.getSearchResultItems().size());
                indexerSearchResult.setHasMoreResults(false);
            }
            indexerSearchResult.setOffset(newznabResponse.getOffset());
            indexerSearchResult.setLimit(100);
        } else {
            indexerSearchResult.setTotalResultsKnown(false);
            indexerSearchResult.setHasMoreResults(false);
            indexerSearchResult.setOffset(0);
            indexerSearchResult.setLimit(0);
        }
    }

    protected SearchResultItem createSearchResultItem(NewznabXmlItem item) {
        SearchResultItem searchResultItem = new SearchResultItem();
        searchResultItem.setLink(item.getLink());

        if (item.getRssGuid().isPermaLink()) {
            searchResultItem.setDetails(item.getRssGuid().getGuid());
            Matcher matcher = GUID_PATTERN.matcher(item.getRssGuid().getGuid());
            if (matcher.matches()) {
                searchResultItem.setIndexerGuid(matcher.group(2));
            } else {
                searchResultItem.setIndexerGuid(item.getRssGuid().getGuid());
            }
        } else {
            searchResultItem.setIndexerGuid(item.getRssGuid().getGuid());
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
        searchResultItem.setIndexerScore(config.getScore().orElse(0));
        searchResultItem.setGuid(SearchResultIdCalculator.calculateSearchResultId(searchResultItem));
        searchResultItem.setAgePrecise(true);
        searchResultItem.setDescription(item.getDescription());
        searchResultItem.setDownloadType(DownloadType.NZB);
        searchResultItem.setCommentsLink(item.getComments());
        searchResultItem.setOriginalCategory(item.getCategory()); //May be overwritten by mapping in attributes
        parseAttributes(item, searchResultItem);

        return searchResultItem;
    }

    protected void parseAttributes(NewznabXmlItem item, SearchResultItem searchResultItem) {
        Map<String, String> attributes = item.getNewznabAttributes().stream().collect(Collectors.toMap(NewznabAttribute::getName, NewznabAttribute::getValue, (a, b) -> b));
        List<Integer> newznabCategories = item.getNewznabAttributes().stream().filter(x -> x.getName().equals("category") && !"None".equals(x.getValue())).map(newznabAttribute -> Integer.parseInt(newznabAttribute.getValue())).collect(Collectors.toList());
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
                error("Unable to parse password value " + passwordValue);
            }
        }
        if (attributes.containsKey("nfo")) {
            searchResultItem.setHasNfo(attributes.get("nfo").equals("1") ? HasNfo.YES : HasNfo.NO);
        }
        if (attributes.containsKey("info") && (config.getBackend() == BackendType.NNTMUX || config.getBackend() == BackendType.NZEDB)) {
            //Info attribute is always a link to an NFO
            searchResultItem.setHasNfo(HasNfo.YES);
        }
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

        computeCategory(searchResultItem, newznabCategories);

        if (searchResultItem.getHasNfo() == HasNfo.MAYBE && (config.getBackend() == BackendType.NNTMUX || config.getBackend() == BackendType.NZEDB)) {
            //For these backends if not specified it doesn't exist
            searchResultItem.setHasNfo(HasNfo.NO);
        }
        if (!searchResultItem.getGroup().isPresent() && !Strings.isNullOrEmpty(item.getDescription()) && item.getDescription().contains("Group:")) {
            //Dog has the group in the description, perhaps others too
            Matcher matcher = GROUP_PATTERN.matcher(item.getDescription());
            if (matcher.matches() && !Objects.equals(matcher.group(1), "not available")) {
                searchResultItem.setGroup(matcher.group(1));
            }
        }
    }

    protected void computeCategory(SearchResultItem searchResultItem, List<Integer> newznabCategories) {
        if (!newznabCategories.isEmpty()) {
            Integer mostSpecific = newznabCategories.stream().max(Integer::compareTo).get();
            IndexerCategoryConfig mapping = config.getCategoryMapping();
            Category category;
            if (mapping == null) { //May be the case in some corner cases
                category = categoryProvider.fromSearchNewznabCategories(newznabCategories, categoryProvider.getNotAvailable());
                searchResultItem.setOriginalCategory(categoryProvider.getNotAvailable().getName());
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
            searchResultItem.setCategory(category);
        } else {
            searchResultItem.setCategory(categoryProvider.getNotAvailable());
        }
    }

    protected Logger getLogger() {
        return logger;
    }

    @Component
    @Order(500)
    public static class NewznabHandlingStrategy implements IndexerHandlingStrategy {

        @Override
        public boolean handlesIndexerConfig(IndexerConfig config) {
            return config.getSearchModuleType() == SearchModuleType.NEWZNAB;
        }

        @Override
        public Class<? extends Indexer> getIndexerClass() {
            return Newznab.class;
        }
    }


}
