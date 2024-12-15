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
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.CustomQueryAndTitleMappingHandler;
import org.nzbhydra.searching.SearchResultAcceptor;
import org.nzbhydra.searching.SearchResultAcceptor.AcceptorResult;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem.HasNfo;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class NzbIndexBeta extends Indexer<NewznabXmlRoot> {

    private static final Logger logger = LoggerFactory.getLogger(NzbIndexBeta.class);
    private static final Pattern GUID_PATTERN = Pattern.compile(".*/download/([\\d\\-a-f]+).*", Pattern.DOTALL);
    private static final Pattern NFO_PATTERN = Pattern.compile(".*<pre id=\"nfo0\">(.*)</pre>.*", Pattern.DOTALL | Pattern.CASE_INSENSITIVE);

    public NzbIndexBeta(ConfigProvider configProvider, IndexerRepository indexerRepository, SearchResultRepository searchResultRepository, IndexerApiAccessRepository indexerApiAccessRepository, IndexerApiAccessEntityShortRepository indexerApiAccessShortRepository, IndexerLimitRepository indexerStatusRepository, IndexerWebAccess indexerWebAccess, SearchResultAcceptor resultAcceptor, CategoryProvider categoryProvider, InfoProvider infoProvider, ApplicationEventPublisher eventPublisher, QueryGenerator queryGenerator, CustomQueryAndTitleMappingHandler titleMapping, BaseConfigHandler baseConfigHandler, IndexerSearchResultPersistor searchResultPersistor) {
        super(configProvider, indexerRepository, searchResultRepository, indexerApiAccessRepository, indexerApiAccessShortRepository, indexerStatusRepository, indexerWebAccess, resultAcceptor, categoryProvider, infoProvider, eventPublisher, queryGenerator, titleMapping, baseConfigHandler, searchResultPersistor);
    }


    @Override
    protected void completeIndexerSearchResult(NewznabXmlRoot response, IndexerSearchResult indexerSearchResult, AcceptorResult acceptorResult, SearchRequest searchRequest, int offset, Integer limit) {
        indexerSearchResult.setTotalResultsKnown(false);
        //Doesn't work when resultCount % 250 == but good enough
        indexerSearchResult.setHasMoreResults(response.getRssChannel().getItems().size() == 250);
        indexerSearchResult.setOffset(offset);
        indexerSearchResult.setPageSize(250);
    }

    @Override
    protected List<SearchResultItem> getSearchResultItems(NewznabXmlRoot rssRoot, SearchRequest searchRequest) {
        if (rssRoot.getRssChannel().getItems() == null || rssRoot.getRssChannel().getItems().isEmpty()) {
            debug("No results found");
            return Collections.emptyList();
        }
        List<SearchResultItem> items = new ArrayList<>();
        for (NewznabXmlItem rssItem : rssRoot.getRssChannel().getItems()) {
            SearchResultItem item = new SearchResultItem();
            item.setPubDate(rssItem.getPubDate());
            String nzbIndexLink = rssItem.getLink();
            item.setTitle(rssItem.getTitle());
            item.setAgePrecise(true);
            if (rssItem.getCategory() != null) {
                item.setGroup(rssItem.getCategory().replace("a.b", "alt.binaries"));
            }
            if (rssItem.getEnclosure() == null || rssItem.getEnclosure().getUrl() == null) {
                logger.error("Unable to parse '{}' result for link - missing URL. Skipping it", nzbIndexLink);
                continue;
            }
            item.setLink(rssItem.getEnclosure().getUrl());
            item.setSize(rssItem.getEnclosure().getLength());
            Matcher matcher = GUID_PATTERN.matcher(nzbIndexLink);
            boolean found = matcher.find();
            if (!found) {
                logger.error("Unable to parse '{}' result for link - missing GUID. Skipping it", nzbIndexLink);
                continue;
            }
            item.setIndexerGuid(matcher.group(1));
            item.setCategory(categoryProvider.getNotAvailable());
            item.setOriginalCategory("N/A");
            item.setIndexerScore(config.getScore());
            if (item.getDescription() != null) {
                item.setHasNfo(rssItem.getDescription().contains("1 NFO") ? HasNfo.YES : HasNfo.NO);
            } else {
                item.setHasNfo(HasNfo.NO);
            }
            item.setIndexer(this);
            item.setDownloadType(DownloadType.NZB);
            items.add(item);
        }

        return items;
    }

    @Override
    protected UriComponentsBuilder buildSearchUrl(SearchRequest searchRequest, Integer offset, Integer limit) throws IndexerSearchAbortedException {
        UriComponentsBuilder componentsBuilder = getBaseUri().path("rss").queryParam("more", "1").queryParam("max", 250).queryParam("hidecross", "0");
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
            throw new IndexerSearchAbortedException("Binsearch cannot search without a query");
        }

        query = addRequiredAndforbiddenWordsToQuery(searchRequest, query);
        query = cleanupQuery(query);
        componentsBuilder.queryParam("q", query);
        componentsBuilder.queryParam("sort", "agedesc");
        //page 0 is the first one
        componentsBuilder.queryParam("page", (offset + 250) / 250 - 1);

        return componentsBuilder;
    }

    private String addRequiredAndforbiddenWordsToQuery(SearchRequest searchRequest, String query) {
        List<String> requiredWords = new ArrayList<>(searchRequest.getInternalData().getRequiredWords());
        requiredWords.addAll(configProvider.getBaseConfig().getSearching().getRequiredWords());
        requiredWords.addAll(searchRequest.getCategory().getRequiredWords());
        if (!requiredWords.isEmpty()) {
            query += (query.isEmpty() ? "" : " ") + Joiner.on(" ").join(requiredWords);
        }

        List<String> forbiddenWords = new ArrayList<>(searchRequest.getInternalData().getForbiddenWords());
        forbiddenWords.addAll(configProvider.getBaseConfig().getSearching().getForbiddenWords());
        forbiddenWords.addAll(searchRequest.getCategory().getForbiddenWords());
        if (!forbiddenWords.isEmpty()) {
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
        URI nfoUri = getBaseUri().pathSegment("nfo", guid).build().toUri();
        try {
            String html = getAndStoreResultToDatabase(nfoUri, String.class, IndexerApiAccessType.NFO);
            Matcher matcher = NFO_PATTERN.matcher(html);
            if (!matcher.find()) {
                return NfoResult.withoutNfo();
            }
            return NfoResult.withNfo(matcher.group(1));
        } catch (IndexerAccessException e) {
            return NfoResult.unsuccessful(e.getMessage());
        }
    }

    @Override
    protected NewznabXmlRoot getAndStoreResultToDatabase(URI uri, IndexerApiAccessType apiAccessType) throws IndexerAccessException {
        return getAndStoreResultToDatabase(uri, NewznabXmlRoot.class, apiAccessType);
    }

    @Override
    protected Logger getLogger() {
        return logger;
    }

    protected UriComponentsBuilder getBaseUri() {
        //Hack but we need "/search" in the base URL because otherwise the connection check will fail and okhttp can't do 307 redirects right now
        return UriComponentsBuilder.fromHttpUrl(config.getHost().replace("/search", "/"));
    }

    @Component
    @Order(2000)
    public static class NewznabHandlingStrategy implements IndexerHandlingStrategy<NzbIndexBeta> {

        @Override
        public boolean handlesIndexerConfig(IndexerConfig config) {
            return config.getSearchModuleType() == SearchModuleType.NZBINDEX_BETA;
        }

        @Override
        public String getName() {
            return "NZBINDEX_BETA";
        }
    }


}
