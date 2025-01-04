package org.nzbhydra.indexers;

import com.google.common.base.Joiner;
import com.google.common.base.Throwables;
import dev.failsafe.Failsafe;
import dev.failsafe.RetryPolicy;
import dev.failsafe.function.CheckedSupplier;
import joptsimple.internal.Strings;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.indexers.exceptions.IndexerParsingException;
import org.nzbhydra.indexers.exceptions.IndexerSearchAbortedException;
import org.nzbhydra.mapping.AgeToPubDateConverter;
import org.nzbhydra.searching.SearchResultAcceptor.AcceptorResult;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem.HasNfo;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.config.ConfigurableBeanFactory;
import org.springframework.context.annotation.Scope;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component("nzbking")
@Scope(ConfigurableBeanFactory.SCOPE_PROTOTYPE)
public class NzbKing extends Indexer<String> {

    private static final Logger logger = LoggerFactory.getLogger(NzbKing.class);

    private static final Pattern TITLE_PATTERN = Pattern.compile("\"(.*)\\.(rar|nfo|mkv|mp3|mobi|avi|mp4|m3u|epub|txt|pdf|par2|001|nzb|url|jpg|zip|flac|m4a|m4b|sfv|7z|md5|r[0-9]{2})\"?", Pattern.CASE_INSENSITIVE); //Note the " (quotation marks)
    private static final Pattern SIZE_PATTERN = Pattern.compile("(?<size>[0-9]+(\\.[0-9]+)?)(?<unit>(GB|MB|KB|B))", Pattern.CASE_INSENSITIVE);
    private static final Pattern NFO_PATTERN = Pattern.compile("<pre>(?<nfo>.*)<\\/pre>", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);

    private final RetryPolicy<Object> retry503policy = RetryPolicy.builder()
            .handleIf(x -> x instanceof IndexerAccessException && Throwables.getStackTraceAsString(x).contains("503"))
            .withDelay(Duration.ofMillis(500))
            .withMaxRetries(2).build();


    @Override
    protected void completeIndexerSearchResult(String response, IndexerSearchResult indexerSearchResult, AcceptorResult acceptorResult, SearchRequest searchRequest, int offset, Integer limit) {
        indexerSearchResult.setHasMoreResults(response.contains("next 50 posts"));
        indexerSearchResult.setTotalResultsKnown(false);
        indexerSearchResult.setPageSize(50);
        indexerSearchResult.setOffset(offset);
    }

    @Override
    protected List<SearchResultItem> getSearchResultItems(String searchRequestResponse, SearchRequest searchRequest) throws IndexerParsingException {
        List<SearchResultItem> items = new ArrayList<>();

        Document doc = Jsoup.parse(searchRequestResponse);
        if (doc.text().contains("Your search criteria did not match any documents")) {
            return Collections.emptyList();
        }

        Elements resultsTables = doc.select("div.search-results-group");
        if (resultsTables.isEmpty()) {
            throw new IndexerParsingException("Unable to find result table in NZBKing page. This happens sometimes ;-)");
        }
        Elements allRows = new Elements();
        boolean isFirstGroup = true;
        for (Element resultsTable : resultsTables) {
            Elements rows = resultsTable.select("div.search-result");
            for (int i = isFirstGroup ? 1 : 0; i < rows.size(); i++) {
                Element row = rows.get(i);
                allRows.add(row);
                SearchResultItem item = parseRow(row);
                if (item == null) {
                    continue;
                }

                items.add(item);
            }
            isFirstGroup = false;
        }
        items.removeIf(item -> !searchRequest.getInternalData().getQueryWords().stream().allMatch(queryWord -> item.getTitle().toLowerCase().contains(queryWord.toLowerCase())));
        debug("Finished parsing {} of {} rows", items.size(), allRows.size());

        return items;
    }

    private SearchResultItem parseRow(Element row) {
        SearchResultItem item = new SearchResultItem();

        Element titleElement = getElementOrNone(row, "div.search-subject");
        if (titleElement == null) {
            debug("Table row does not have a title");
            return null;
        }
        String title = titleElement.childNode(0).toString().trim();
        if (title.contains("password protect") || title.contains("passworded")) {
            item.setPassworded(true);
        }
        Matcher matcher = TITLE_PATTERN.matcher(title);
        String filename;
        if (!matcher.find()) {
            debug("Unable to find title in text {}", title);
            return null;
        }
        title = matcher.group(1);
        filename = matcher.group(1) + "." + matcher.group(2);
        title = cleanUpTitle(title);
        item.setTitle(title);
        item.setAttributes(new HashMap<>(Map.of("filename", filename)));

        item.setIndexerGuid(getElementOrNone(row, "input[type=checkbox]").attr("value"));
        item.setLink("https://www.nzbking.com/nzb:" + item.getIndexerGuid());
        item.setDetails("https://www.nzbking.com/details:" + item.getIndexerGuid());

        Element groupElement = getElementOrNone(row, "div.search-groups");
        if (groupElement != null) {
            item.setGroup(groupElement.ownText());
        }

        Element posterElement = getElementOrNone(row, "div.search-poster");
        if (posterElement != null) {
            item.setPoster(posterElement.text());
        }

        String partsAndSize = titleElement.childNodes().get(6).outerHtml().trim();
        if (!findSize(item, partsAndSize)) {
            partsAndSize = titleElement.childNodes().get(8).outerHtml().trim();
            findSize(item, partsAndSize);
        }

        Element nfoElement = getElementOrNone(titleElement, "a[href^=/nfo]");

        item.setHasNfo(nfoElement != null ? HasNfo.YES : HasNfo.NO);

        Element ageElement = getElementOrNone(row, "div.search-age");
        if (ageElement != null) {
            String pubdateString = ageElement.text();
            Instant pubdate = AgeToPubDateConverter.convertToInstant(pubdateString);
            item.setPubDate(pubdate);
            item.setAgePrecise(false);
        } else {
            debug("Unable to find pubdate in row {}", row.text());
//            return null;
        }

        item.setCategory(categoryProvider.getNotAvailable());
        item.setIndexer(this);
        item.setDownloadType(DownloadType.NZB);
        item.setIndexerScore(config.getScore());
        return item;
    }

    private boolean findSize(SearchResultItem item, String partsAndSize) {
        Matcher sizeMatcher = SIZE_PATTERN.matcher(partsAndSize);
        if (sizeMatcher.find()) {
            Float size = Float.parseFloat(sizeMatcher.group("size"));
            String unit = sizeMatcher.group("unit");
            switch (unit) {
                case "GB" -> size = size * 1024 * 1024 * 1024;
                case "MB" -> size = size * 1024 * 1024;
                case "KB" -> size = size * 1024;
            }
            item.setSize(size.longValue());
            return true;
        } else {
            return false;
        }
    }

    private Element getElementOrNone(Element parent, String selector) {
        Elements selectionResult = parent.select(selector);
        return selectionResult.isEmpty() ? null : selectionResult.get(0);
    }

    @Override
    protected UriComponentsBuilder buildSearchUrl(SearchRequest searchRequest, Integer offset, Integer limit) throws IndexerSearchAbortedException {
        String query = super.generateQueryIfApplicable(searchRequest, "");
        query = addRequiredWordsToQuery(searchRequest, query);

        if (Strings.isNullOrEmpty(query)) {
            throw new IndexerSearchAbortedException("NZBKing cannot search without a query");
        }
        query = cleanupQuery(query);
        UriComponentsBuilder queryBuilder = UriComponentsBuilder.fromHttpUrl("https://www.nzbking.com/search")
                .queryParam("q", query);
        if (getConfig().isBinsearchOtherGroups()) {
            queryBuilder = queryBuilder.queryParam("server", "2");
        }
        queryBuilder = queryBuilder.queryParam("o", offset);
        return queryBuilder;
    }

    private String addRequiredWordsToQuery(SearchRequest searchRequest, String query) {
        List<String> requiredWords = searchRequest.getInternalData().getRequiredWords();
        requiredWords.addAll(configProvider.getBaseConfig().getSearching().getRequiredWords());
        requiredWords.addAll(searchRequest.getCategory().getRequiredWords());
        if (!requiredWords.isEmpty()) {
            query += (query.isEmpty() ? "" : " ") + Joiner.on(" ").join(requiredWords);
        }

        return query;
    }

    @Override
    public NfoResult getNfo(String guid) {
        URI nfoUri = UriComponentsBuilder.fromHttpUrl(config.getHost()).pathSegment("viewNFO.php").queryParam("oid", guid).build().toUri();
        try {
            String html = getAndStoreResultToDatabase(nfoUri, String.class, IndexerApiAccessType.NFO);
            Matcher matcher = NFO_PATTERN.matcher(html);
            if (!matcher.find()) {
                return NfoResult.withoutNfo();
            }
            return NfoResult.withNfo(matcher.group("nfo"));
        } catch (IndexerAccessException e) {
            return NfoResult.unsuccessful(e.getMessage());
        }
    }

    @Override
    protected String getAndStoreResultToDatabase(URI uri, IndexerApiAccessType apiAccessType) throws IndexerAccessException {
        return Failsafe.with(retry503policy)
                .onFailure(throwable -> logger.warn("Encountered 503 error. Will retry"))
                .get(new CheckedSupplier<>() {
                    @Override
                    public String get() throws Throwable {
                        return getAndStoreResultToDatabase(uri, String.class, apiAccessType);
                    }
                });
    }

    @Override
    protected Logger getLogger() {
        return logger;
    }


    @Component
    @Order(2000)
    public static class HandlingStrategy implements IndexerHandlingStrategy<NzbKing> {

        @Override
        public boolean handlesIndexerConfig(IndexerConfig config) {
            return config.getSearchModuleType() == SearchModuleType.NZBKING;
        }

        @Override
        public String getName() {
            return "NZBKING";
        }
    }
}
