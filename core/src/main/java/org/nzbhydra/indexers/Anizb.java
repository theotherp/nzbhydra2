package org.nzbhydra.indexers;

import com.google.common.base.Joiner;
import joptsimple.internal.Strings;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.indexers.exceptions.IndexerParsingException;
import org.nzbhydra.indexers.exceptions.IndexerSearchAbortedException;
import org.nzbhydra.indexers.status.IndexerLimitRepository;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.CustomQueryAndTitleMapping;
import org.nzbhydra.searching.SearchResultAcceptor;
import org.nzbhydra.searching.SearchResultAcceptor.AcceptorResult;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem.DownloadType;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem.HasNfo;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.BeanFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.core.annotation.Order;
import org.springframework.oxm.Unmarshaller;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;

public class Anizb extends Indexer<NewznabXmlRoot> {

    private static final Logger logger = LoggerFactory.getLogger(Anizb.class);

    public Anizb(ConfigProvider configProvider, IndexerRepository indexerRepository, SearchResultRepository searchResultRepository, IndexerApiAccessRepository indexerApiAccessRepository, IndexerApiAccessEntityShortRepository indexerApiAccessShortRepository, IndexerLimitRepository indexerStatusRepository, IndexerWebAccess indexerWebAccess, SearchResultAcceptor resultAcceptor, CategoryProvider categoryProvider, InfoProvider infoProvider, ApplicationEventPublisher eventPublisher, QueryGenerator queryGenerator, CustomQueryAndTitleMapping titleMapping) {
        super(configProvider, indexerRepository, searchResultRepository, indexerApiAccessRepository, indexerApiAccessShortRepository, indexerStatusRepository, indexerWebAccess, resultAcceptor, categoryProvider, infoProvider, eventPublisher, queryGenerator, titleMapping);
    }

    @Override
    protected void completeIndexerSearchResult(NewznabXmlRoot response, IndexerSearchResult indexerSearchResult, AcceptorResult acceptorResult, SearchRequest searchRequest, int offset, Integer limit) {
        indexerSearchResult.setHasMoreResults(false);
        indexerSearchResult.setTotalResults(indexerSearchResult.getSearchResultItems().size());
        indexerSearchResult.setPageSize(100);
        indexerSearchResult.setOffset(0);
        indexerSearchResult.setTotalResultsKnown(true);
    }

    @Override
    protected List<SearchResultItem> getSearchResultItems(NewznabXmlRoot rssRoot, SearchRequest searchRequest) throws IndexerParsingException {
        List<SearchResultItem> items = new ArrayList<>();
        for (NewznabXmlItem rssItem : rssRoot.getRssChannel().getItems()) {
            SearchResultItem item = new SearchResultItem();
            item.setOriginalCategory("Anime");
            item.setTitle(rssItem.getTitle());
            item.setLink(rssItem.getLink());
            item.setIndexerGuid(rssItem.getRssGuid().getGuid());
            item.setSize(rssItem.getEnclosure().getLength());
            item.setPubDate(rssItem.getPubDate());
            item.setIndexerScore(config.getScore());
            item.setHasNfo(HasNfo.NO);
            item.setAgePrecise(true);
            item.setCategory(categoryProvider.getByInternalName("Anime"));
            item.setIndexer(this);
            item.setDownloadType(DownloadType.NZB);
            items.add(item);
        }

        return items;
    }


    @Override
    protected UriComponentsBuilder buildSearchUrl(SearchRequest searchRequest, Integer offset, Integer limit) throws IndexerSearchAbortedException {
        String query = super.generateQueryIfApplicable(searchRequest, "");
        query = addRequiredWordsToQuery(searchRequest, query);

        if (Strings.isNullOrEmpty(query)) {
            throw new IndexerSearchAbortedException("Anizb cannot search without a query");
        }
        query = cleanupQuery(query);

        return UriComponentsBuilder.fromHttpUrl("https://anizb.org/api/").queryParam("q", query);
    }

    private String addRequiredWordsToQuery(SearchRequest searchRequest, String query) {
        List<String> requiredWords;
        requiredWords = searchRequest.getInternalData().getRequiredWords();
        requiredWords.addAll(configProvider.getBaseConfig().getSearching().getRequiredWords());
        requiredWords.addAll(searchRequest.getCategory().getRequiredWords());
        if (!requiredWords.isEmpty()) {
            query += (query.isEmpty() ? "" : " ") + Joiner.on(" ").join(requiredWords);
        }

        return query;
    }

    @Override
    public NfoResult getNfo(String guid) {
        return NfoResult.withoutNfo();

    }

    @Override
    protected NewznabXmlRoot getAndStoreResultToDatabase(URI uri, IndexerApiAccessType apiAccessType) throws IndexerAccessException {
        return getAndStoreResultToDatabase(uri, NewznabXmlRoot.class, apiAccessType);
    }

    @Override
    protected Logger getLogger() {
        return logger;
    }

    @Component
    @Order(2000)
    public static class NewznabHandlingStrategy implements IndexerHandlingStrategy<Anizb> {

        @Override
        public boolean handlesIndexerConfig(IndexerConfig config) {
            return config.getSearchModuleType() == SearchModuleType.ANIZB;
        }

        @Override
        public String getName() {
            return "ANIZB";
        }


    }
}
