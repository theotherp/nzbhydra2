package org.nzbhydra.mockserver;

import com.google.common.base.Charsets;
import com.google.common.collect.Lists;
import com.google.common.io.Resources;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mapping.newznab.NewznabParameters;
import org.nzbhydra.mapping.newznab.builder.RssItemBuilder;
import org.nzbhydra.mapping.newznab.mock.NewznabMockBuilder;
import org.nzbhydra.mapping.newznab.mock.NewznabMockRequest;
import org.nzbhydra.mapping.newznab.xml.NewznabAttribute;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlApilimits;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlError;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlResponse;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Random;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@SuppressWarnings("ALL")
@RestController
public class MockNewznab {

    private static final Logger logger = LoggerFactory.getLogger(MockNewznab.class);

    private static HashMap<Integer, Integer> apikeyToResultCount = new HashMap<>();
    private static HashMap<Integer, NewznabXmlRoot> responsesPerApikey = new HashMap<>();
    private Random random = new Random();

    @Value("${main.host:127.0.0.1}")
    private String host;
    @Value("${server.port:5080}")
    private int port;

    private static final int API_MAX = 300;

    static {
        apikeyToResultCount.put(0, 10);
        apikeyToResultCount.put(1, 20);
        apikeyToResultCount.put(2, 400);
        apikeyToResultCount.put(3, 300);
        apikeyToResultCount.put(4, 200);
        apikeyToResultCount.put(5, API_MAX);
        apikeyToResultCount.put(10, 10);
        apikeyToResultCount.put(API_MAX, 30);
    }

    @PostConstruct
    public void init() {
        NewznabMockBuilder.host = this.host;
        NewznabMockBuilder.port = this.port;
    }


    @RequestMapping(value = "/nzb/{nzbId}", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> nzbDownload(@PathVariable String nzbId) throws Exception {
        if (nzbId.endsWith("91")) {
            logger.info("Returning 91 - too many requests");
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).build();
        }
        if (nzbId.endsWith("92")) {
            logger.info("Returning 92 - not found");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        if (nzbId.endsWith("93")) {

            logger.info("Returning 429 - request limit reached");
            return ResponseEntity.status(429).body("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
                "<error code=\"429\" description=\"Request limit reached\"/>");
        }

        logger.info("Returning NZB with ID {}", nzbId);
        return ResponseEntity.ok("Would download NZB with ID" + nzbId);
    }

    @RequestMapping(value = "/details/{nzbId}", produces = MediaType.APPLICATION_XML_VALUE)
    public String nzbDetails(@PathVariable String nzbId) throws Exception {
        return "Would show details for NZB with ID" + nzbId;
    }

    @RequestMapping(value = "/comments/{nzbId}", produces = MediaType.APPLICATION_XML_VALUE)
    public String nzbComments(@PathVariable String nzbId) throws Exception {
        return "Would show comments for NZB with ID" + nzbId;
    }

    @RequestMapping(value = {"/api", "/dognzb/api"}, produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<? extends Object> api(NewznabParameters params, HttpServletRequest request) throws Exception {
        logger.info("Received API request {}", params);
        if ("429".equals(params.getApikey())) {
            return new ResponseEntity<>(HttpStatusCode.valueOf(429));
        }
        if (params.getT() == ActionAttribute.CAPS) {
            //throw new RuntimeException("test");
            return new ResponseEntity<Object>(NewznabMockBuilder.getCaps(), HttpStatus.OK);
        }

        if ("403".equals(params.getQ())) {
            return new ResponseEntity<Object>("error body", HttpStatus.FORBIDDEN);
        }

        if (params.getT() == ActionAttribute.GETNFO) {
            NewznabXmlRoot rssRoot = new NewznabXmlRoot();
            rssRoot.getRssChannel().setNewznabResponse(new NewznabXmlResponse(0, 1));
            NewznabXmlItem item = new NewznabXmlItem();
            item.setDescription("NFO for NZB with ID " + params.getId());
            rssRoot.getRssChannel().getItems().add(item);
            return ResponseEntity.ok(rssRoot);
        }

        String itemTitleBase = params.getApikey();
        if (params.getQ() != null && params.getQ().contains("groups")) {
            itemTitleBase = "";
        }

        if (params.getRid() != null && params.getQ() == null) {
            NewznabXmlRoot rssRoot = NewznabMockBuilder.generateResponse(0, -1, itemTitleBase, false, Collections.emptyList(), false, 0);
            logger.info("Returning no results for rid based search without query");
            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }

        if ("0108052".equals(params.getImdbid())) {
            NewznabXmlRoot rssRoot = NewznabMockBuilder.generateResponse(0, -1, itemTitleBase, false, Collections.emptyList(), false, 0);
            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }

        if ("24".equals(params.getTmdbid())) {
            NewznabXmlRoot rssRoot = NewznabMockBuilder.generateResponse(0, API_MAX, itemTitleBase, false, Collections.emptyList(), false, 0);
            rssRoot.getRssChannel().getNewznabResponse().setTotal(10_000);
            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }

        if ("samenames".equals(params.getQ())) {
            NewznabXmlRoot rssRoot = NewznabMockBuilder.generateResponse(0, API_MAX, "", false, Collections.emptyList(), false, 0);
            rssRoot.getRssChannel().getNewznabResponse().setTotal(1000);
            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }

        if ("titleduplicates".equals(params.getQ())) {
            List<NewznabXmlItem> items = new ArrayList<>();
            Random random = new Random();
            for (int i = 0; i < 10; i++) {
                Instant pubDate = Instant.now().minus(i * 100, ChronoUnit.DAYS).minus(params.getApikey().equals("1") ? 10 : 20, ChronoUnit.DAYS);
                NewznabXmlItem newznabXmlItem = NewznabMockBuilder.buildItem(i, "result" + i, pubDate, String.valueOf(1000 * i), "a" + random.nextInt(), "b", "5069", "", false, "result" + i);
                items.add(newznabXmlItem);
            }
            NewznabXmlRoot rssRoot = NewznabMockBuilder.getRssRoot(items, 0, 10);
            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }


        boolean doGenerateDuplicates = params.getQ() != null && params.getQ().startsWith("duplicates");
        if (params.getQ() != null && params.getQ().equals("offsettest")) {
            NewznabXmlRoot rssRoot = new NewznabXmlRoot();
            rssRoot.getRssChannel().setNewznabResponse(new NewznabXmlResponse(0, 0));
            if (params.getOffset() >= 40) {
                return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
            }
            int start = params.getOffset() == 0 ? 0 : params.getOffset();
            int end = Math.min(start + 10 - 1, 40);
            rssRoot = NewznabMockBuilder.generateResponse(start, end, "offsetTest", doGenerateDuplicates, Collections.emptyList(), false, 0);

            rssRoot.getRssChannel().getNewznabResponse().setTotal(40);
            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }

        if (params.getQ() != null && params.getQ().equals("offsettest2")) {
            NewznabMockRequest mockRequest = NewznabMockRequest.builder().numberOfResults(API_MAX).titleBase("offsettest").offset(params.getOffset()).titleWords(Collections.emptyList()).total(300).build();
            NewznabXmlRoot rssRoot = NewznabMockBuilder.generateResponse(mockRequest);
            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }

        if (params.getT() == ActionAttribute.TVSEARCH && params.getImdbid() != null) {
            NewznabMockRequest mockRequest = NewznabMockRequest.builder().numberOfResults(15).titleBase("tv").newznabCategory("5040").offset(0).total(15).titleBase("game of thrones").build();
            NewznabXmlRoot rssRoot = NewznabMockBuilder.generateResponse(mockRequest);
            List<NewznabXmlItem> items = rssRoot.getRssChannel().getItems();
            for (int i = 0; i < 15; i++) {

                items.get(i).getNewznabAttributes().add(new NewznabAttribute("season", "1"));
                items.get(i).getNewznabAttributes().add(new NewznabAttribute("episode", String.valueOf(i % 3)));
            }

            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }

        if (params.getQ() != null && params.getQ().equals("tv")) {
            NewznabMockRequest mockRequest = NewznabMockRequest.builder().numberOfResults(1000).titleBase("tv").newznabCategory("5040").offset(0).total(15).build();
            NewznabXmlRoot rssRoot = NewznabMockBuilder.generateResponse(mockRequest);
            List<NewznabXmlItem> items = rssRoot.getRssChannel().getItems();
            for (int i = 0; i < 1000; i++) {
                NewznabXmlItem item = items.get(i);
                item.setTitle("s0" + i * 1 + "e0" + i + "-" + random.nextInt());
                item.getNewznabAttributes().add(new NewznabAttribute("showtitle", "showtitle"));
                item.getNewznabAttributes().add(new NewznabAttribute("ctageory", "5000"));
                item.getNewznabAttributes().add(new NewznabAttribute("season", "S" + i * 1));
                item.getNewznabAttributes().add(new NewznabAttribute("episode", "E" + i));
            }


            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }

        if (params.getQ() != null && params.getQ().equals("invalidxml")) {
            String invalidXml = Resources.toString(Resources.getResource(MockNewznab.class, "invalidXml.xml"), Charsets.UTF_8);
            return new ResponseEntity<Object>(invalidXml, HttpStatus.OK);
        }

        if (params.getQ() != null && params.getQ().equals("slash")) {
            NewznabMockRequest mockRequest = NewznabMockRequest.builder().numberOfResults(API_MAX).titleBase("/").offset(params.getOffset()).titleWords(Collections.emptyList()).total(300).build();
            NewznabXmlRoot rssRoot = NewznabMockBuilder.generateResponse(mockRequest);
            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }

        if (params.getQ() != null && params.getQ().equals("actualduplicates")) {
            NewznabMockRequest mockRequest = NewznabMockRequest.builder().numberOfResults(10).titleBase("actualduplicates").offset(params.getOffset()).titleWords(Collections.emptyList()).total(10).build();
            NewznabXmlRoot rssRoot = NewznabMockBuilder.generateResponse(mockRequest);
            rssRoot.getRssChannel().getItems().forEach(x -> x.setTitle(rssRoot.getRssChannel().getItems().get(0).getTitle()));
            rssRoot.getRssChannel().getItems().forEach(x -> x.setLink(rssRoot.getRssChannel().getItems().get(0).getLink()));
            rssRoot.getRssChannel().getItems().forEach(x -> x.setRssGuid(rssRoot.getRssChannel().getItems().get(0).getRssGuid()));
            rssRoot.getRssChannel().getItems().forEach(x -> x.setNewznabAttributes(rssRoot.getRssChannel().getItems().get(0).getNewznabAttributes()));
            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }

        if (params.getQ() != null && params.getQ().equals("oneresult")) {
            NewznabMockRequest mockRequest = NewznabMockRequest.builder().numberOfResults(1).titleBase("oneresult").offset(params.getOffset()).titleWords(Collections.emptyList()).total(1).build();
            NewznabXmlRoot rssRoot = NewznabMockBuilder.generateResponse(mockRequest);
            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }

        if (params.getQ() != null && params.getQ().equals("uitest")) {
            if (params.getApikey().equals("1")) {
                NewznabXmlItem result1 = RssItemBuilder.builder("indexer1-result1").pubDate(Instant.now().minus(1, ChronoUnit.DAYS)).hasNfo(false).grabs(1).size(mbToBytes(1)).newznabAttributes(new ArrayList<>(Arrays.asList(new NewznabAttribute("category", "5000")))).category("TV").build();
                NewznabXmlItem result2 = RssItemBuilder.builder("indexer1-result2").pubDate(Instant.now().minus(2, ChronoUnit.DAYS)).hasNfo(true).grabs(2).size(mbToBytes(2)).newznabAttributes(new ArrayList<>(Arrays.asList(new NewznabAttribute("category", "5040")))).category("TV SD").build();
                NewznabXmlItem result3 = RssItemBuilder.builder("indexer1-result3").pubDate(Instant.now().minus(3, ChronoUnit.DAYS)).comments("comments").grabs(3).size(mbToBytes(3)).newznabAttributes(new ArrayList<>(Arrays.asList(new NewznabAttribute("category", "5030")))).category("TV HD").build();
                NewznabXmlRoot rssRoot = NewznabMockBuilder.getRssRoot(Arrays.asList(result1, result2, result3), 0, 3);
                return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
            }


            NewznabXmlItem result4 = RssItemBuilder.builder("indexer2-result1").pubDate(Instant.now().minus(4, ChronoUnit.DAYS)).grabs(4).size(mbToBytes(4)).newznabAttributes(new ArrayList<>(Arrays.asList(new NewznabAttribute("category", "2000")))).category("Movies").build();
            NewznabXmlItem result5 = RssItemBuilder.builder("indexer2-result2").pubDate(Instant.now().minus(5, ChronoUnit.DAYS)).grabs(5).size(mbToBytes(5)).newznabAttributes(new ArrayList<>(Arrays.asList(new NewznabAttribute("category", "2040")))).category("Movies HD").build();
            NewznabXmlRoot rssRoot = NewznabMockBuilder.getRssRoot(Arrays.asList(result4, result5), 0, 2);
            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }

        if (params.getQ() != null && params.getQ().equals("dognzbtotaltest") && System.getProperty("nomockdognzb") == null) {
            if (params.getOffset() >= 300) {
                NewznabXmlRoot rssRoot = NewznabMockBuilder.generateResponse(0, -1, itemTitleBase, false, Collections.emptyList(), false, 0);
                return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
            }
            NewznabMockRequest mockRequest = NewznabMockRequest.builder().numberOfResults(API_MAX).titleBase("dognzbtotaltest").offset(params.getOffset()).titleWords(Collections.emptyList()).total(300).build();
            NewznabXmlRoot rssRoot = NewznabMockBuilder.generateResponse(mockRequest);
            rssRoot.getRssChannel().getNewznabResponse().setTotal(API_MAX);
            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }

        if ((params.getQ() != null && params.getQ().equals("noresults")) || (params.getTvdbid() != null && params.getTvdbid().equals("329089"))) {
            NewznabXmlRoot rssRoot = NewznabMockBuilder.generateResponse(0, -1, itemTitleBase, false, Collections.emptyList(), false, 0);
            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }

        if (params.getQ() != null) {
            Matcher matcher = Pattern.compile("sleep(\\d+)-(\\d+).*").matcher(params.getQ());
            if (matcher.matches()) {
                int from = Integer.parseInt(matcher.group(1));
                int to = Integer.parseInt(matcher.group(2));
                logger.info("Sleeping {} to {} s", from, to);
                Thread.sleep(new Random().nextInt(to * 1000) + from * 1000);
            }
        }


        if (params.getQ() != null && params.getQ().startsWith("sleep")) {
            Thread.sleep(new Random().nextInt(5000));
        }

        if (params.getQ() != null && params.getQ().startsWith("sleep10")) {
            Thread.sleep(10000);
        }
        if (params.getQ() != null && params.getQ().startsWith("sleep20")) {
            Thread.sleep(20000);
        }
        if (params.getQ() != null && params.getQ().equals("sleeplong1") && params.getApikey().equals("1")) {
            logger.info("Sleeping long for indexer 1");
            Thread.sleep(10000 * 10000);
        }
        if (params.getQ() != null && params.getQ().equals("sleeplong")) {
            Thread.sleep(10000 * 60);
        }


        if (params.getQ() != null && params.getQ().contains("movies")) {
            NewznabXmlRoot rssRoot = NewznabMockBuilder.generateResponse(0, API_MAX, itemTitleBase, false, Arrays.asList("cam", "ts", "blu-ray 2160p", "web-dl 1080p", "bluray 1080p", "3d bluray"), false, 0);
            rssRoot.getRssChannel().getNewznabResponse().setTotal(API_MAX);
            rssRoot.getRssChannel().getItems().forEach(x -> x.getNewznabAttributes().add(new NewznabAttribute("coverurl", "https://i.omgwtfnzbs.org/tvdb/697fdaeb0fb1ac87d4d6af684b20593a/697fdaeb0fb1ac87d4d6af684b20593a.jpg")));
            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }

        if ("oneduplicate".equals(params.getQ())) {
            NewznabMockRequest mockRequest = NewznabMockRequest.builder()
                .numberOfResults(1)
                .titleBase(itemTitleBase)
                .generateOneDuplicate(true)
                .build();
            NewznabXmlRoot rssRoot = NewznabMockBuilder.generateResponse(mockRequest);
            rssRoot.getRssChannel().getNewznabResponse().setTotal(1);
            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }

        if ("titlegroup".equals(params.getQ())) {
            NewznabMockRequest mockRequest = NewznabMockRequest.builder()
                .numberOfResults(1)
                .titleBase(itemTitleBase)
                .generateOneDuplicate(false)
                .build();
            NewznabXmlRoot rssRoot = NewznabMockBuilder.generateResponse(mockRequest);
            rssRoot.getRssChannel().getNewznabResponse().setTotal(1);
            rssRoot.getRssChannel().getItems().forEach(x -> x.setTitle("titlegroup"));
            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }

        if (params.getTmdbid() != null) {
            if (itemTitleBase.equals("tmdberror") || "capscheckerror".equals(params.getApikey())) {
                NewznabXmlError rssError = new NewznabXmlError("123", "description");
                return new ResponseEntity<Object>(rssError, HttpStatus.OK);
            }

            NewznabXmlRoot rssRoot = NewznabMockBuilder.generateResponse(0, 10, "avengers", doGenerateDuplicates, Collections.emptyList(), false, 0);
            if (params.getApikey().contains("limits")) {
                final NewznabXmlApilimits apiLimits = new NewznabXmlApilimits(0, API_MAX, null, null);

                rssRoot.getRssChannel().setApiLimits(apiLimits);
            }
            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }

        if ("limitsNoDownloads".equals(params.getQ())) {
            NewznabXmlRoot rssRoot = NewznabMockBuilder.generateResponse(0, 10, "avengers", doGenerateDuplicates, Collections.emptyList(), false, 0);
            final NewznabXmlApilimits apiLimits = new NewznabXmlApilimits(0, API_MAX, null, null);
            rssRoot.getRssChannel().setApiLimits(apiLimits);
            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }

        if ("error".equals(params.getQ())) {
            NewznabXmlError rssError = new NewznabXmlError("123", "description");
            return new ResponseEntity<Object>(rssError, HttpStatus.OK);
        }

        if (params.getImdbid() != null) {
            NewznabXmlRoot rssRoot = NewznabMockBuilder.generateResponse(0, 10, "avengers", doGenerateDuplicates, Collections.emptyList(), false, 0);
            rssRoot.getRssChannel().getNewznabResponse().setTotal(10);
            if (params.getApikey().contains("limits")) {
                rssRoot.getRssChannel().setApiLimits(new NewznabXmlApilimits(0, API_MAX, 0, 200));
            }
            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }

        int endIndex;
        int key = 0;
        try {
            key = Integer.valueOf(itemTitleBase);
        } catch (NumberFormatException e) {
            endIndex = 0;
        }
        if (apikeyToResultCount.containsKey(key)) {
            endIndex = apikeyToResultCount.get(key);
        } else {
            endIndex = 0;
        }
        if (params.getQ() != null) {
            try {
                endIndex = Integer.parseInt(params.getQ().replace("duplicates", "").replaceAll(" .*", ""));
            } catch (NumberFormatException e) {
            }
        }

        if (params.getQ() != null && params.getQ().startsWith("show")) {
            endIndex = Integer.parseInt(params.getQ().substring(4));
            NewznabXmlRoot rssRoot = NewznabMockBuilder.generateResponse(params.getOffset() == null ? 0 : params.getOffset(), endIndex, params.getApikey(), doGenerateDuplicates, Collections.emptyList(), false, params.getOffset());
            rssRoot.getRssChannel().getNewznabResponse().setTotal(endIndex);
            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }

        if (params.getQ() != null && params.getQ().startsWith("blub")) {
            endIndex = API_MAX;
            String titleBase = params.getQ() + "_" + params.getApikey();
            if (!params.getCat().isEmpty()) {
                titleBase += params.getCat().get(0);
            }
            NewznabXmlRoot rssRoot = NewznabMockBuilder.generateResponse(params.getOffset() == null ? 0 : params.getOffset(), endIndex, titleBase, doGenerateDuplicates, Collections.emptyList(), false, params.getOffset());
            rssRoot.getRssChannel().getNewznabResponse().setTotal(endIndex);
            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }


        if (responsesPerApikey.containsKey(endIndex)) {
            return new ResponseEntity<Object>(responsesPerApikey.get(endIndex), HttpStatus.OK);
        } else {
            int startIndex = 0;
            if (params.getOffset() != null && params.getLimit() != null) {
                endIndex = Math.min(params.getOffset() + params.getLimit(), endIndex);
            }
            if ("paging".equalsIgnoreCase(params.getQ())) {
                endIndex = API_MAX;
            } else if (params.getQ() != null && params.getQ().startsWith("paging")) {

                NewznabXmlRoot rssRoot = NewznabMockBuilder.generateResponse(params.getOffset(), params.getOffset() + params.getLimit(), params.getApikey(), doGenerateDuplicates, Collections.emptyList(), false, params.getOffset());
                rssRoot.getRssChannel().getNewznabResponse().setTotal(Integer.parseInt(params.getQ().substring(6)));
                return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
            }
            NewznabXmlRoot rssRoot = NewznabMockBuilder.generateResponse(startIndex, endIndex, params.getApikey(), doGenerateDuplicates, Collections.emptyList(), false, params.getOffset());
            rssRoot.getRssChannel().getNewznabResponse().setTotal(endIndex);

            if (params.getQ() != null && params.getQ().startsWith("paging")) {
                List<NewznabXmlItem> items = rssRoot.getRssChannel().getItems();
                int resultsPerDay = Integer.parseInt(params.getApikey());
                List<List<NewznabXmlItem>> partitions = Lists.partition(items, resultsPerDay);
                for (int i = 0; i < partitions.size(); i++) {
                    List<NewznabXmlItem> partition = partitions.get(i);
                    for (NewznabXmlItem item : partition) {
                        int daysToSubtract = i;
                        if (params.getOffset() > 0) {
                            daysToSubtract += params.getOffset() / resultsPerDay;
                        }

                        item.setPubDate(Instant.now().minus(daysToSubtract, ChronoUnit.DAYS));
                    }
                }
                for (int i = 0; i < items.size(); i++) {
                    NewznabXmlItem item = items.get(i);
                    item.setPubDate(item.getPubDate().minus(i, ChronoUnit.MINUTES));
                }
                rssRoot.getRssChannel().getNewznabResponse().setTotal(300);

                if (params.getQ().contains("error")) {
                    if (params.getApikey().equals("100")) {
                        return new ResponseEntity<Object>(rssRoot, HttpStatus.NOT_FOUND);
                    }
                }
            }

            if ("randomage".equalsIgnoreCase(params.getQ())) {
                for (NewznabXmlItem item : rssRoot.getRssChannel().getItems()) {
                    item.setPubDate(item.getPubDate().minus(random.nextInt(300) * 24, ChronoUnit.HOURS));
                }
            }
            if (params.getQ() != null && params.getQ().equals("limits")) {
                rssRoot.getRssChannel().setApiLimits(new NewznabXmlApilimits(1, API_MAX, 2, 200, Instant.now().minus(10, ChronoUnit.HOURS), Instant.now().minus(10, ChronoUnit.HOURS)));
            } else if (params.getQ() != null && params.getQ().equals("limitswithoutdates")) {
                rssRoot.getRssChannel().setApiLimits(new NewznabXmlApilimits(1, API_MAX, 2, 200, null, null));
            }

            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }
    }

    private long mbToBytes(int mb) {
        return mb * 1024L * 1024L;
    }


    @RequestMapping(value = "/torznab/api", produces = {MediaType.TEXT_XML_VALUE, MediaType.APPLICATION_XML_VALUE})
    public ResponseEntity<? extends Object> torznabapi(NewznabParameters params) throws Exception {
        if (params.getT() == ActionAttribute.CAPS) {
            return new ResponseEntity<Object>(NewznabMockBuilder.getCaps(), HttpStatus.OK);
        }
        String titleBase = params.getQ() + "_" + params.getApikey();
        if (!params.getCat().isEmpty()) {
            titleBase += params.getCat().get(0);
        }

        if ("samenames".equals(params.getQ())) {
            titleBase = "";
        }

        NewznabXmlRoot rssRoot = NewznabMockBuilder.generateResponse(0, API_MAX, titleBase, false, Collections.emptyList(), true, 0);
        rssRoot.getRssChannel().setNewznabResponse(null);
        Random random = new Random();

        for (NewznabXmlItem item : rssRoot.getRssChannel().getItems()) {
            item.setNewznabAttributes(new ArrayList<>());
            item.getTorznabAttributes().add(new NewznabAttribute("seeders", String.valueOf(random.nextInt(30000))));
            item.getTorznabAttributes().add(new NewznabAttribute("peers", String.valueOf(random.nextInt(30000))));
            item.getTorznabAttributes().add(new NewznabAttribute("uploadvolumefactor", "1.0"));
            if (random.nextInt(5) == 3) {
                item.getTorznabAttributes().add(new NewznabAttribute("downloadvolumefactor", "0"));
            } else {
                item.getTorznabAttributes().add(new NewznabAttribute("downloadvolumefactor", String.valueOf(random.nextFloat())));
            }
            if (random.nextInt(5) > 3) {
                item.getTorznabAttributes().add(new NewznabAttribute("grabs", String.valueOf(random.nextInt(30000))));
            }
            item.setCategory("5000");

            item.setGrabs(null);
//            item.getNewznabAttributes().clear();

        }

        return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
    }


}
