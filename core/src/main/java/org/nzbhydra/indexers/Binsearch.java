package org.nzbhydra.indexers;

import com.google.common.base.Joiner;
import joptsimple.internal.Strings;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.config.SearchModuleType;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.indexers.exceptions.IndexerParsingException;
import org.nzbhydra.indexers.exceptions.IndexerSearchAbortedException;
import org.nzbhydra.searching.IndexerSearchResult;
import org.nzbhydra.searching.SearchResultAcceptor.AcceptorResult;
import org.nzbhydra.searching.SearchResultItem;
import org.nzbhydra.searching.SearchResultItem.DownloadType;
import org.nzbhydra.searching.SearchResultItem.HasNfo;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.UnsupportedEncodingException;
import java.net.URI;
import java.net.URLDecoder;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.temporal.ChronoField;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class Binsearch extends Indexer<String> {

    private static final Logger logger = LoggerFactory.getLogger(Binsearch.class);

    private static final Pattern TITLE_PATTERN = Pattern.compile("\"(.*)\\.(rar|nfo|mkv|par2|001|nzb|url|zip|r[0-9]{2})\"", Pattern.CASE_INSENSITIVE); //Note the " (quotation marks)
    private static final Pattern GROUP_PATTERN = Pattern.compile("&g=([\\w\\.]*)&", Pattern.CASE_INSENSITIVE);
    private static final Pattern POSTER_PATTERN = Pattern.compile("&p=(.*)&", Pattern.CASE_INSENSITIVE);
    private static final Pattern NFO_INFO_PATTERN = Pattern.compile("\\d nfo file", Pattern.CASE_INSENSITIVE);
    private static final Pattern SIZE_PATTERN = Pattern.compile("size: (?<size>[0-9]+(\\.[0-9]+)?).(?<unit>(GB|MB|KB|B))", Pattern.CASE_INSENSITIVE);
    private static final Pattern PUBDATE_PATTERN = Pattern.compile("(\\d{1,2}\\-\\w{3}\\-\\d{4})", Pattern.CASE_INSENSITIVE);
    private static final DateTimeFormatter DATE_TIME_FORMATTER = new DateTimeFormatterBuilder().appendPattern("dd-MMM-yyyy").parseDefaulting(ChronoField.NANO_OF_DAY, 0).toFormatter().withZone(ZoneId.of("UTC"));
    private static final Pattern NFO_PATTERN = Pattern.compile("<pre>(?<nfo>.*)<\\/pre>", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);


    //LATER It's not ideal that currently the web response needs to be parsed twice, once for the search results and once for the completion of the indexer search result. Will need to check how much that impacts performance

    @Override
    protected void completeIndexerSearchResult(String response, IndexerSearchResult indexerSearchResult, AcceptorResult acceptorResult, SearchRequest searchRequest) {
        Document doc = Jsoup.parse(response);
        Element navigationTable = doc.select("table.xMenuT").get(1);
        Elements pageLinks = navigationTable.select("a");
        boolean hasMore = !pageLinks.isEmpty() && pageLinks.last().text().equals(">");
        boolean totalKnown = false;
        indexerSearchResult.setOffset(searchRequest.getOffset().orElse(0));
        int total = searchRequest.getOffset().orElse(0) + 100; //Must be at least as many as already loaded
        if (!hasMore) { //Parsed page contains all the available results
            total = searchRequest.getOffset().orElse(0) + indexerSearchResult.getSearchResultItems().size();
            totalKnown = true;
        }
        indexerSearchResult.setHasMoreResults(hasMore);
        indexerSearchResult.setTotalResults(total);
        indexerSearchResult.setLimit(100);
        indexerSearchResult.setTotalResultsKnown(totalKnown);
    }


    @SuppressWarnings("ConstantConditions")
    @Override
    protected List<SearchResultItem> getSearchResultItems(String searchRequestResponse) throws IndexerParsingException {
        List<SearchResultItem> items = new ArrayList<>();

        Document doc = Jsoup.parse(searchRequestResponse);
        if (doc.text().contains("No results in most popular groups")) {
            return Collections.emptyList();
        }

        Elements mainTables = doc.select("table#r2");
        if (mainTables.size() == 0) {
            throw new IndexerParsingException("Unable to find main table in binsearch page. This happens sometimes ;-)");
        }
        Element mainTable = mainTables.get(0);
        Elements rows = mainTable.select("tr");
        for (int i = 1; i < rows.size(); i++) { //First row is header
            Element row = rows.get(i);
            SearchResultItem item = parseRow(row);
            if (item == null) {
                continue;
            }
            items.add(item);
        }
        debug("Finished parsing {} of {} rows", items.size(), rows.size());

        return items;
    }

    private SearchResultItem parseRow(Element row) {
        SearchResultItem item = new SearchResultItem();

        Element titleElement = getElementOrNone(row, "span[class=s]");
        if (titleElement == null) {
            debug("Table row does not have a title");
            return null;
        }
        String title = titleElement.ownText();
        if (title.contains("password protect") || title.contains("passworded")) {
            item.setPassworded(true);
        }
        Matcher matcher = TITLE_PATTERN.matcher(title);
        if (matcher.find()) {
            title = matcher.group(1);
        }
        title = cleanUpTitle(title);
        item.setTitle(title);

        item.setIndexerGuid(getElementOrNone(row, "input[type=checkbox]").attr("name"));
        item.setLink("https://www.binsearch.info/?action=nzb&" + item.getIndexerGuid() + "=1");
        Element infoElement = getElementOrNone(row, "span.d");
        if (infoElement == null) {
            debug("Ignored entry because it has no info");
            return null;
        }
        String collectionLink = getElementOrNone(row, "a").attr("href"); //e.g. /?b=Supers.Troopers.of.Mega.3D.TOPBOT.TrueFrench.1080p.X264.A&g=alt.binaries.movies.mkv&p=Ramer%40marmer.com+%28Clown_nez%29&max=250
        item.setDetails("https://www.binsearch.info" + collectionLink);

        Matcher groupMatcher = GROUP_PATTERN.matcher(collectionLink);
        if (groupMatcher.find()) {
            item.setGroup(groupMatcher.group(1).trim());
        }

        Matcher posterMatcher = POSTER_PATTERN.matcher(collectionLink); //e.g. Ramer%40marmer.com+%28Clown_nez%29
        if (posterMatcher.find()) {
            String poster = posterMatcher.group(1).trim();
            try {
                poster = URLDecoder.decode(poster, "UTF-8").replace("+", " ");
                item.setPoster(poster);
            } catch (UnsupportedEncodingException e) {
                debug("Unable to decode poster {}", poster);
            }
        }

        Matcher sizeMatcher = SIZE_PATTERN.matcher(infoElement.ownText());
        if (sizeMatcher.find()) {
            Float size = Float.valueOf(sizeMatcher.group("size"));
            String unit = sizeMatcher.group("unit");
            switch (unit) {
                case "GB":
                    size = size * 1000 * 1000 * 1000;
                    break;
                case "MB":
                    size = size * 1000 * 1000;
                    break;
                case "KB":
                    size = size * 1000;
                    break;
            }
            item.setSize(size.longValue());
        } else {
            debug("Unable to find size in text {}", infoElement.ownText());
            return null;
        }

        Matcher nfoMatcher = NFO_INFO_PATTERN.matcher(infoElement.ownText());
        item.setHasNfo(nfoMatcher.find() ? HasNfo.YES : HasNfo.NO);

        Matcher pubdateMatcher = PUBDATE_PATTERN.matcher(row.text());
        if (pubdateMatcher.find()) {
            String pubdateString = pubdateMatcher.group(1);
            Instant pubdate = DATE_TIME_FORMATTER.parse(pubdateString, Instant::from);
            item.setPubDate(pubdate);
            item.setAgePrecise(false);
        } else {
            debug("Unable to find pubdate in row {}", row.text());
            return null;
        }

        item.setCategory(categoryProvider.getNotAvailable());
        item.setIndexer(this);
        item.setDownloadType(DownloadType.NZB);
        item.setIndexerScore(config.getScore().orElse(0));
        return item;
    }

    private Element getElementOrNone(Element parent, String selector) {
        Elements selectionResult = parent.select(selector);
        return selectionResult.size() == 0 ? null : selectionResult.get(0);
    }

    @Override
    protected UriComponentsBuilder buildSearchUrl(SearchRequest searchRequest, Integer offset, Integer limit) throws IndexerSearchAbortedException {
        String query = super.generateQueryIfApplicable(searchRequest, "");
        query = addRequiredWordsToQuery(searchRequest, query);

        if (Strings.isNullOrEmpty(query)) {
            throw new IndexerSearchAbortedException("Binsearch cannot search without a query");
        }
        query = cleanupQuery(query);

        return UriComponentsBuilder.fromHttpUrl("https://www.binsearch.info/?adv_col=on&postdate=date&adv_sort=date").queryParam("min", offset).queryParam("max", limit).queryParam("q", query);
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
        return getAndStoreResultToDatabase(uri, String.class, apiAccessType);
    }

    @Override
    protected Logger getLogger() {
        return logger;
    }

    @Component
    @Order(2000)
    public static class NewznabHandlingStrategy implements IndexerHandlingStrategy {

        @Override
        public boolean handlesIndexerConfig(IndexerConfig config) {
            return config.getSearchModuleType() == SearchModuleType.BINSEARCH;
        }

        @Override
        public Class<? extends Indexer> getIndexerClass() {
            return Binsearch.class;
        }
    }
}
