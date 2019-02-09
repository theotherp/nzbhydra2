package org.nzbhydra.mockserver;

import com.google.common.base.Charsets;
import com.google.common.io.Resources;
import org.apache.catalina.servlet4preview.http.HttpServletRequest;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mapping.newznab.NewznabParameters;
import org.nzbhydra.mapping.newznab.builder.RssItemBuilder;
import org.nzbhydra.mapping.newznab.mock.NewznabMockBuilder;
import org.nzbhydra.mapping.newznab.mock.NewznabMockRequest;
import org.nzbhydra.mapping.newznab.xml.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@SuppressWarnings("ALL")
@RestController
public class MockNewznab {

    private static final Logger logger = LoggerFactory.getLogger(MockNewznab.class);

    private static HashMap<Integer, Integer> apikeyToResultCount = new HashMap<>();
    private static HashMap<Integer, NewznabXmlRoot> responsesPerApikey = new HashMap<>();
    private Random random = new Random();

    static {
        apikeyToResultCount.put(0, 10);
        apikeyToResultCount.put(1, 500);
        apikeyToResultCount.put(2, 400);
        apikeyToResultCount.put(3, 300);
        apikeyToResultCount.put(4, 200);
        apikeyToResultCount.put(5, 100);
    }


    @RequestMapping(value = "/nzb/{nzbId}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> nzbDownload(@PathVariable String nzbId) throws Exception {
        if (nzbId.contains("11")) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).build();
        }
        return ResponseEntity.ok("Would download NZB with ID" + nzbId);
    }

    @RequestMapping(value = "/details/{nzbId}", produces = MediaType.TEXT_HTML_VALUE)
    public String nzbDetails(@PathVariable String nzbId) throws Exception {
        return "Would show details for NZB with ID" + nzbId;
    }

    @RequestMapping(value = "/comments/{nzbId}", produces = MediaType.TEXT_HTML_VALUE)
    public String nzbComments(@PathVariable String nzbId) throws Exception {
        return "Would show comments for NZB with ID" + nzbId;
    }

    @RequestMapping(value = {"/api", "/dognzb/api"}, produces = MediaType.TEXT_XML_VALUE)
    public ResponseEntity<? extends Object> api(NewznabParameters params, HttpServletRequest request) throws Exception {

        if (params.getT() == ActionAttribute.CAPS) {
            //throw new RuntimeException("test");
            return new ResponseEntity<Object>(NewznabMockBuilder.getCaps(), HttpStatus.OK);
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
            NewznabXmlRoot rssRoot = NewznabMockBuilder.generateResponse(0, -1, itemTitleBase, false, Collections.emptyList());
            logger.info("Returning no results for rid based search without query");
            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }

        boolean doGenerateDuplicates = "duplicates".equals(params.getQ());
        if (params.getQ() != null && params.getQ().equals("offsettest")) {
            NewznabXmlRoot rssRoot = new NewznabXmlRoot();
            rssRoot.getRssChannel().setNewznabResponse(new NewznabXmlResponse(0, 0));
            if (params.getOffset() >= 40) {
                return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
            }
            int start = params.getOffset() == 0 ? 0 : params.getOffset();
            int end = Math.min(start + 10 - 1, 40);
            rssRoot = NewznabMockBuilder.generateResponse(start, end, "offsetTest", doGenerateDuplicates, Collections.emptyList());

            rssRoot.getRssChannel().getNewznabResponse().setTotal(40);
            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }

        if (params.getQ() != null && params.getQ().equals("offsettest2")) {
            NewznabMockRequest mockRequest = NewznabMockRequest.builder().numberOfResults(100).titleBase("offsettest").offset(params.getOffset()).titleWords(Collections.emptyList()).total(300).build();
            NewznabXmlRoot rssRoot = NewznabMockBuilder.generateResponse(mockRequest);
            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }

        if (params.getQ() != null && params.getQ().equals("invalidxml")) {
            String invalidXml = Resources.toString(Resources.getResource(MockNewznab.class, "invalidXml.xml"), Charsets.UTF_8);
            return new ResponseEntity<Object>(invalidXml, HttpStatus.OK);
        }

        if (params.getQ() != null && params.getQ().equals("slash")) {
            NewznabMockRequest mockRequest = NewznabMockRequest.builder().numberOfResults(100).titleBase("/").offset(params.getOffset()).titleWords(Collections.emptyList()).total(300).build();
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
                NewznabXmlRoot rssRoot = NewznabMockBuilder.generateResponse(0, -1, itemTitleBase, false, Collections.emptyList());
                return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
            }
            NewznabMockRequest mockRequest = NewznabMockRequest.builder().numberOfResults(100).titleBase("dognzbtotaltest").offset(params.getOffset()).titleWords(Collections.emptyList()).total(300).build();
            NewznabXmlRoot rssRoot = NewznabMockBuilder.generateResponse(mockRequest);
            rssRoot.getRssChannel().getNewznabResponse().setTotal(100);
            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }

        if ((params.getQ() != null && params.getQ().equals("noresults")) || (params.getTvdbid() != null && params.getTvdbid().equals("329089"))) {
            NewznabXmlRoot rssRoot = NewznabMockBuilder.generateResponse(0, -1, itemTitleBase, false, Collections.emptyList());
            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }

        if (params.getQ() != null && params.getQ().equals("sleep")) {
            Thread.sleep(new Random().nextInt(5000));
        }

        if (params.getQ() != null && params.getQ().equals("sleep10")) {
            Thread.sleep(10000);
        }
        if (params.getQ() != null && params.getQ().equals("sleepforever")) {
            Thread.sleep(10000 * 10000);
        }


        if (params.getQ() != null && params.getQ().contains("movies")) {
            NewznabXmlRoot rssRoot = NewznabMockBuilder.generateResponse(0, 100, itemTitleBase, false, Arrays.asList("cam", "ts", "blu-ray 2160p", "web-dl 1080p", "bluray 1080p", "3d bluray"));
            rssRoot.getRssChannel().getNewznabResponse().setTotal(100);
            rssRoot.getRssChannel().getItems().forEach(x -> x.getNewznabAttributes().add(new NewznabAttribute("coverurl", "https://i.omgwtfnzbs.me/tvdb/697fdaeb0fb1ac87d4d6af684b20593a/697fdaeb0fb1ac87d4d6af684b20593a.jpg")));
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

            NewznabXmlRoot rssRoot = NewznabMockBuilder.generateResponse(0, 10, "avengers", doGenerateDuplicates, Collections.emptyList());
            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }

        if ("error".equals(params.getQ())) {
            NewznabXmlError rssError = new NewznabXmlError("123", "description");
            return new ResponseEntity<Object>(rssError, HttpStatus.OK);
        }

        if (params.getImdbid() != null) {
            NewznabXmlRoot rssRoot = NewznabMockBuilder.generateResponse(0, 10, "avengers", doGenerateDuplicates, Collections.emptyList());
            rssRoot.getRssChannel().getNewznabResponse().setTotal(10);
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


        if (responsesPerApikey.containsKey(endIndex)) {
            return new ResponseEntity<Object>(responsesPerApikey.get(endIndex), HttpStatus.OK);
        } else {
            if (params.getOffset() != null && params.getLimit() != null) {
                endIndex = Math.min(params.getOffset() + params.getLimit(), endIndex);
            }
            NewznabXmlRoot rssRoot = NewznabMockBuilder.generateResponse(0, endIndex, itemTitleBase, doGenerateDuplicates, Collections.emptyList());
            rssRoot.getRssChannel().getNewznabResponse().setTotal(endIndex);

            if ("randomage".equalsIgnoreCase(params.getQ())) {
                for (NewznabXmlItem item : rssRoot.getRssChannel().getItems()) {
                    item.setPubDate(item.getPubDate().minus(random.nextInt(300) * 24, ChronoUnit.HOURS));
                }

            }

            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }
    }

    private long mbToBytes(int mb) {
        return mb * 1024L * 1024L;
    }


    @RequestMapping(value = "/torznab/api", produces = MediaType.TEXT_XML_VALUE)
    public ResponseEntity<? extends Object> torznabapi(NewznabParameters params) throws Exception {
        if (params.getT() == ActionAttribute.CAPS) {
            return new ResponseEntity<Object>(NewznabMockBuilder.getCaps(), HttpStatus.OK);
        }
        NewznabXmlRoot rssRoot = NewznabMockBuilder.generateResponse(0, 10, params.getApikey(), false, Collections.emptyList());
        Random random = new Random();
        for (NewznabXmlItem item : rssRoot.getRssChannel().getItems()) {
            item.setNewznabAttributes(new ArrayList<>());
            item.getTorznabAttributes().add(new NewznabAttribute("seeders", String.valueOf(random.nextInt(30000))));
            item.getTorznabAttributes().add(new NewznabAttribute("peers", String.valueOf(random.nextInt(30000))));
            if (random.nextInt(5) > 3) {
                item.getTorznabAttributes().add(new NewznabAttribute("grabs", String.valueOf(random.nextInt(30000))));
            }
            item.setCategory("5000");
            item.setGrabs(null);
        }
        return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
    }


}