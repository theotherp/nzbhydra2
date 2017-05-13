package org.nzbhydra.indexers;

import org.nzbhydra.database.IndexerApiAccessType;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.indexers.exceptions.IndexerSearchAbortedException;
import org.nzbhydra.mapping.newznab.RssItem;
import org.nzbhydra.mapping.newznab.RssRoot;
import org.nzbhydra.searching.IndexerSearchResult;
import org.nzbhydra.searching.ResultAcceptor.AcceptorResult;
import org.nzbhydra.searching.SearchResultItem;
import org.nzbhydra.searching.SearchResultItem.DownloadType;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class NzbIndex extends Indexer<RssRoot> {

    private static final Logger logger = LoggerFactory.getLogger(NzbIndex.class);
    private static final Pattern GUID_PATTERN = Pattern.compile(".*/release/(\\d+).*");

    @Override
    protected void completeIndexerSearchResult(RssRoot response, IndexerSearchResult indexerSearchResult, AcceptorResult acceptorResult) {
        //Never provide more than the first 100 results, RSS doesn't allow paging
        indexerSearchResult.setTotalResultsKnown(true);
        indexerSearchResult.setTotalResults(acceptorResult.getNumberOfRejectedResults() + indexerSearchResult.getSearchResultItems().size());
        indexerSearchResult.setHasMoreResults(false);
        indexerSearchResult.setOffset(0);
        indexerSearchResult.setLimit(100);
    }

    @Override
    protected List<SearchResultItem> getSearchResultItems(RssRoot rssRoot) {
        if (rssRoot.getRssChannel().getItems() == null || rssRoot.getRssChannel().getItems().isEmpty()) {
            debug("No results found");
            return Collections.emptyList();
        }
        List<SearchResultItem> items = new ArrayList<>();
        for (RssItem rssItem : rssRoot.getRssChannel().getItems()) {
            SearchResultItem item = new SearchResultItem();
            item.setTitle(rssItem.getTitle());
            item.setPubDate(rssItem.getPubDate());
            item.setGroup(rssItem.getCategory());
            item.setLink(rssItem.getRssGuid().getGuid());
            item.setSize(rssItem.getEnclosure().getLength());
            Matcher matcher = GUID_PATTERN.matcher(rssItem.getLink());
            matcher.find();
            item.setIndexerGuid(matcher.group(1));
            item.setCategory(categoryProvider.getNotAvailable());
            item.setIndexer(this);
            item.setDownloadType(DownloadType.NZB);
            items.add(item);
        }

        return items;
    }

    @Override
    protected UriComponentsBuilder buildSearchUrl(SearchRequest searchRequest, Integer offset, Integer limit) throws IndexerSearchAbortedException {
        UriComponentsBuilder componentsBuilder = getBaseUri().path("rss").queryParam("more", "1").queryParam("max", searchRequest.getLimit().orElse(100)).queryParam("hidecross", "1"); //TODO Limit

        String query = searchRequest.getQuery().orElse(""); //TODO query generation
        //TODO paging

//        componentsBuilder = extendQueryUrlWithSearchIds(searchRequest, componentsBuilder);
//        query = generateQueryIfApplicable(searchRequest, query);
//        query = addRequiredAndExcludedWordsToQuery(searchRequest, query);
        //addFurtherParametersToUri(searchRequest, componentsBuilder, query);
        componentsBuilder.queryParam("q", query);

        return componentsBuilder;
    }

    @Override
    public NfoResult getNfo(String guid) {
        return null;
    }

    @Override
    protected RssRoot getAndStoreResultToDatabase(URI uri, IndexerApiAccessType apiAccessType) throws IndexerAccessException {
        return getAndStoreResultToDatabase(uri, RssRoot.class, apiAccessType);
    }

    @Override
    protected Logger getLogger() {
        return logger;
    }


    protected UriComponentsBuilder getBaseUri() {
        return UriComponentsBuilder.fromHttpUrl(config.getHost());
    }


}
