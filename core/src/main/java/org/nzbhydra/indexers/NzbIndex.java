package org.nzbhydra.indexers;

import com.google.common.base.Joiner;
import org.nzbhydra.database.IndexerApiAccessType;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.indexers.exceptions.IndexerSearchAbortedException;
import org.nzbhydra.mapping.newznab.RssItem;
import org.nzbhydra.mapping.newznab.RssRoot;
import org.nzbhydra.searching.IndexerSearchResult;
import org.nzbhydra.searching.ResultAcceptor.AcceptorResult;
import org.nzbhydra.searching.SearchResultItem;
import org.nzbhydra.searching.SearchResultItem.DownloadType;
import org.nzbhydra.searching.SearchResultItem.HasNfo;
import org.nzbhydra.searching.SearchType;
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
    private static final Pattern GUID_PATTERN = Pattern.compile(".*/release/(\\d+).*", Pattern.DOTALL);
    private static final Pattern NFO_PATTERN = Pattern.compile(".*<pre id=\"nfo0\">(.*)</pre>.*", Pattern.DOTALL | Pattern.CASE_INSENSITIVE);

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
            item.setPubDate(rssItem.getPubDate());
            String nzbIndexLink = rssItem.getLink();
            item.setTitle(nzbIndexLink.substring(nzbIndexLink.lastIndexOf('/') + 1, nzbIndexLink.length() - 4)); //Use the NZB name as title because it's already somewhat cleaned up
            item.setAgePrecise(true);
            item.setGroup(rssItem.getCategory().replace("a.b", "alt.binaries"));
            item.setLink(rssItem.getEnclosure().getUrl());
            item.setSize(rssItem.getEnclosure().getLength());
            Matcher matcher = GUID_PATTERN.matcher(nzbIndexLink);
            boolean found = matcher.find();
            if (!found) {
                logger.error("Unable to parse '{}' result for link. Skipping it", nzbIndexLink);
                continue;
            }
            item.setIndexerGuid(matcher.group(1));
            item.setCategory(categoryProvider.getNotAvailable());
            item.setOriginalCategory("N/A");
            item.setHasNfo(rssItem.getDescription().contains("1 NFO") ? HasNfo.YES : HasNfo.NO);
            item.setIndexer(this);
            item.setDownloadType(DownloadType.NZB);
            items.add(item);
        }

        return items;
    }

    @Override
    protected UriComponentsBuilder buildSearchUrl(SearchRequest searchRequest, Integer offset, Integer limit) throws IndexerSearchAbortedException {
        UriComponentsBuilder componentsBuilder = getBaseUri().path("rss").queryParam("more", "1").queryParam("max", searchRequest.getLimit().orElse(100)).queryParam("hidecross", "1");
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
            componentsBuilder.queryParam("age", searchRequest.getMaxage().get());
        }

        String query = "";
        query = generateQueryIfApplicable(searchRequest, query);
        query = addRequiredAndExcludedWordsToQuery(searchRequest, query);

        componentsBuilder.queryParam("q", query);

        return componentsBuilder;
    }

    private String addRequiredAndExcludedWordsToQuery(SearchRequest searchRequest, String query) {
        List<String> requiredWords = searchRequest.getInternalData().getRequiredWords();
        requiredWords.addAll(configProvider.getBaseConfig().getSearching().getRequiredWords());
        requiredWords.addAll(searchRequest.getCategory().getRequiredWords());
        if (!requiredWords.isEmpty()) {
            query += (query.isEmpty() ? "" : " ") + Joiner.on(" ").join(requiredWords);
        }

        List<String> excludedWords = searchRequest.getInternalData().getExcludedWords();
        excludedWords.addAll(configProvider.getBaseConfig().getSearching().getForbiddenWords());
        excludedWords.addAll(searchRequest.getCategory().getForbiddenWords());
        if (!excludedWords.isEmpty()) {
            query += (query.isEmpty() ? "" : " ") + "-" + Joiner.on(" -").join(excludedWords);

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
