package org.nzbhydra.indexers;

import com.google.common.base.Joiner;
import joptsimple.internal.Strings;
import org.nzbhydra.config.BaseConfigHandler;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.indexers.exceptions.IndexerSearchAbortedException;
import org.nzbhydra.indexers.status.IndexerLimitRepository;
import org.nzbhydra.mapping.nzbindex.NzbIndexRoot;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.CustomQueryAndTitleMappingHandler;
import org.nzbhydra.searching.SearchResultAcceptor;
import org.nzbhydra.searching.SearchResultAcceptor.AcceptorResult;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

public class NzbIndexApi extends Indexer<NzbIndexRoot> {

    //https://nzbindex.com/api/v3
    //https://api.nzbindex.com/api/v3/search/?key=apikey&q=foo+|+bar+-something&max=250

    private static final Logger logger = LoggerFactory.getLogger(NzbIndexApi.class);
    private static final Pattern NFO_PATTERN = Pattern.compile(".*<pre id=\"nfo0\">(.*)</pre>.*", Pattern.DOTALL | Pattern.CASE_INSENSITIVE);
    public static final int PAGE_SIZE = 250;

    public NzbIndexApi(ConfigProvider configProvider, IndexerRepository indexerRepository, SearchResultRepository searchResultRepository, IndexerApiAccessRepository indexerApiAccessRepository, IndexerApiAccessEntityShortRepository indexerApiAccessShortRepository, IndexerLimitRepository indexerStatusRepository, IndexerWebAccess indexerWebAccess, SearchResultAcceptor resultAcceptor, CategoryProvider categoryProvider, InfoProvider infoProvider, ApplicationEventPublisher eventPublisher, QueryGenerator queryGenerator, CustomQueryAndTitleMappingHandler titleMapping, BaseConfigHandler baseConfigHandler, IndexerSearchResultPersistor searchResultPersistor) {
        super(configProvider, indexerRepository, searchResultRepository, indexerApiAccessRepository, indexerApiAccessShortRepository, indexerStatusRepository, indexerWebAccess, resultAcceptor, categoryProvider, infoProvider, eventPublisher, queryGenerator, titleMapping, baseConfigHandler, searchResultPersistor);
    }


    @Override
    protected void completeIndexerSearchResult(NzbIndexRoot response, IndexerSearchResult indexerSearchResult, AcceptorResult acceptorResult, SearchRequest searchRequest, int offset, Integer limit) {
        indexerSearchResult.setTotalResultsKnown(true);
        indexerSearchResult.setTotalResults(response.getStats().getTotal());
        indexerSearchResult.setHasMoreResults(response.getStats().isHas_next_page());
        indexerSearchResult.setOffset(response.getStats().getPage_start());
        indexerSearchResult.setPageSize(response.getStats().getPer_page());
    }

    @Override
    protected List<SearchResultItem> getSearchResultItems(NzbIndexRoot rssRoot, SearchRequest searchRequest) {
        List<SearchResultItem> items = new ArrayList<>();
        for (NzbIndexRoot.Result result : rssRoot.getResults()) {
            SearchResultItem item = new SearchResultItem();
            item.setIndexer(this);
            item.setLink("https://api.nzbindex.com/api/v3/download/?key=%s&r[]=%s".formatted(config.getApiKey(), result.getId()));
            item.setTitle(result.getName());
            item.setPoster(result.getPoster());
            item.setPubDate(Instant.ofEpochMilli(result.getPosted()));
            item.setAgePrecise(true);
            item.setPassworded(result.isPassword());
            item.setSize(result.getSize());
            item.setIndexerGuid(String.valueOf(result.getId()));
            item.setGroup(String.join(", ", result.getGroup_names()));
            item.setCategory(categoryProvider.getNotAvailable());
            item.setOriginalCategory("N/A");
            item.setIndexerScore(config.getScore());
            //Doesn't allow downloading NFOs so might as well not have one
//            item.setHasNfo(result.getFile_types() != null && result.getFile_types().getOrDefault("nfo", 0) > 0 ? SearchResultItem.HasNfo.YES : SearchResultItem.HasNfo.NO);
            item.setHasNfo(SearchResultItem.HasNfo.NO);
            item.setDownloadType(DownloadType.NZB);
            items.add(item);
        }

        return items;
    }

    @Override
    protected UriComponentsBuilder buildSearchUrl(SearchRequest searchRequest, Integer offset, Integer limit) throws IndexerSearchAbortedException {
        //https://api.nzbindex.com/api/v3/search/?key=apikey&q=foo+|+bar+-something&max=250
        UriComponentsBuilder componentsBuilder = getBaseUri().path("api/v3/search")
                .queryParam("key", config.getApiKey())
                .queryParam("max", PAGE_SIZE)
                .queryParam("hidespam", "1")
                .queryParam("complete", "1")
                .queryParam("p", offset == null ? 0 : offset / PAGE_SIZE);

        if (searchRequest.getMinsize().isPresent()) {
            componentsBuilder.queryParam("minsize", searchRequest.getMinsize().get());
        } else if (config.getGeneralMinSize().isPresent()) {
            componentsBuilder.queryParam("minsize", config.getGeneralMinSize().get());
        }
        if (searchRequest.getMaxsize().isPresent()) {
            componentsBuilder.queryParam("maxsize", searchRequest.getMaxsize().get());
        }
        if (searchRequest.getMinage().isPresent()) {
            componentsBuilder.queryParam("minage", searchRequest.getMinage().get());
        }

        if (searchRequest.getMaxage().isPresent()) {
            componentsBuilder.queryParam("maxage", searchRequest.getMaxage().get());
        }


        String query = "";
        query = generateQueryIfApplicable(searchRequest, query);

        if (Strings.isNullOrEmpty(query)) {
            throw new IndexerSearchAbortedException("NzbIndex cannot search without a query");
        }

        query = addRequiredAndforbiddenWordsToQuery(searchRequest, query);
        query = cleanupQuery(query);
        componentsBuilder.queryParam("q", query);

        return componentsBuilder;
    }

    private String addRequiredAndforbiddenWordsToQuery(SearchRequest searchRequest, String query) {
        List<String> requiredWords = new ArrayList<>(searchRequest.getInternalData().getRequiredWords());
        requiredWords.addAll(configProvider.getBaseConfig().getSearching().getRequiredWords());
        requiredWords.addAll(searchRequest.getCategory().getRequiredWords());
        if (!requiredWords.isEmpty()) {
            if (query.length() > 256) {
                logger.warn("Stopped extending query {} as it would exceed max length of 256 characters", query);
                return query;
            }
            query += (query.isEmpty() ? "" : " ") + Joiner.on(" ").join(requiredWords);
        }

        List<String> forbiddenWords = new ArrayList<>(searchRequest.getInternalData().getForbiddenWords());
        forbiddenWords.addAll(configProvider.getBaseConfig().getSearching().getForbiddenWords());
        forbiddenWords.addAll(searchRequest.getCategory().getForbiddenWords());
        if (!forbiddenWords.isEmpty()) {
            if (query.length() > 256) {
                logger.warn("Stopped extending query {} as it would exceed max length of 256 characters", query);
                return query;
            }
            query += (query.isEmpty() ? "" : " ") + "-" + Joiner.on(" -").join(forbiddenWords);

        }
        return query;
    }

    @Override
    protected String generateQueryIfApplicable(SearchRequest searchRequest, String query) throws IndexerSearchAbortedException {
        query = super.generateQueryIfApplicable(searchRequest, query);
        if (searchRequest.getSearchType() == SearchType.BOOK) {
            query += " ebook | pdf | mobi | epub";
        }
        return query;
    }

    @Override
    public NfoResult getNfo(String guid) {
        return NfoResult.withoutNfo();
    }

    @Override
    protected NzbIndexRoot getAndStoreResultToDatabase(URI uri, IndexerApiAccessType apiAccessType) throws IndexerAccessException {
        return super.getAndStoreResultToDatabase(uri, NzbIndexRoot.class, apiAccessType);
    }


    @Override
    protected Logger getLogger() {
        return logger;
    }

    protected UriComponentsBuilder getBaseUri() {
        return UriComponentsBuilder.fromHttpUrl(config.getHost());
    }

    @Component
    @Order(2000)
    public static class NewznabHandlingStrategy implements IndexerHandlingStrategy<NzbIndexApi> {

        @Override
        public boolean handlesIndexerConfig(IndexerConfig config) {
            return config.getSearchModuleType() == SearchModuleType.NZBINDEX_API;
        }

        @Override
        public String getName() {
            return "NZBINDEX_API";
        }
    }


}
