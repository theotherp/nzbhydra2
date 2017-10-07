package org.nzbhydra.mockserver;

import org.apache.catalina.servlet4preview.http.HttpServletRequest;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mapping.newznab.NewznabAttribute;
import org.nzbhydra.mapping.newznab.NewznabParameters;
import org.nzbhydra.mapping.newznab.NewznabResponse;
import org.nzbhydra.mapping.newznab.RssError;
import org.nzbhydra.mapping.newznab.RssItem;
import org.nzbhydra.mapping.newznab.RssRoot;
import org.nzbhydra.mapping.newznab.mock.NewznabMockBuilder;
import org.nzbhydra.mapping.newznab.mock.NewznabMockRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.Random;

@SuppressWarnings("ALL")
@RestController
public class MockNewznab {

    private static final Logger logger = LoggerFactory.getLogger(MockNewznab.class);

    private static HashMap<Integer, Integer> apikeyToResultCount = new HashMap<>();
    private static HashMap<Integer, RssRoot> responsesPerApikey = new HashMap<>();

    static {
        apikeyToResultCount.put(0, 10);
        apikeyToResultCount.put(1, 500);
        apikeyToResultCount.put(2, 400);
        apikeyToResultCount.put(3, 300);
        apikeyToResultCount.put(4, 200);
        apikeyToResultCount.put(5, 100);
    }


    @RequestMapping(value = "/nzb/{nzbId}", produces = MediaType.TEXT_HTML_VALUE)
    public String nzbDownload(@PathVariable String nzbId) throws Exception {
        return "Would download NZB with ID" + nzbId;
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
        logger.info(request.getHeader("user-agent"));

        if (params.getT() == ActionAttribute.CAPS) {
            //throw new RuntimeException("test");
            return new ResponseEntity<Object>(NewznabMockBuilder.getCaps(), HttpStatus.OK);
        }

        if (params.getT() == ActionAttribute.GETNFO) {
            RssRoot rssRoot = new RssRoot();
            rssRoot.getRssChannel().setNewznabResponse(new NewznabResponse(0, 1));
            RssItem item = new RssItem();
            item.setDescription("NFO for NZB with ID " + params.getId());
            rssRoot.getRssChannel().getItems().add(item);
            return ResponseEntity.ok(rssRoot);
        }

        String itemTitleBase = params.getApikey();
        if (params.getQ() != null && params.getQ().contains("groups")) {
            itemTitleBase = "";
        }

        if (params.getRid() != null && params.getQ() == null) {
            RssRoot rssRoot = NewznabMockBuilder.generateResponse(0, -1, itemTitleBase, false, Collections.emptyList());
            logger.info("Returning no results for rid based search without query");
            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }

        if (params.getQ() != null && params.getQ().equals("offsettest")) {
            RssRoot rssRoot = new RssRoot();
            rssRoot.getRssChannel().setNewznabResponse(new NewznabResponse(0, 0));
            if (params.getOffset() >= 40) {
                return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
            }
            int start = params.getOffset() == 0 ? 0 : params.getOffset();
            int end = Math.min(start + 10 - 1, 40);
            rssRoot = NewznabMockBuilder.generateResponse(start, end, "offsetTest", "duplicates".equals(params.getQ()), Collections.emptyList());

            rssRoot.getRssChannel().getNewznabResponse().setTotal(40);
            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }

        if (params.getQ() != null && params.getQ().equals("offsettest2")) {
            NewznabMockRequest mockRequest = NewznabMockRequest.builder().numberOfResults(100).titleBase("offsettest").offset(params.getOffset()).titleWords(Collections.emptyList()).total(300).build();
            RssRoot rssRoot = NewznabMockBuilder.generateResponse(mockRequest);
            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }

        if (params.getQ() != null && params.getQ().equals("oneresult")) {
            NewznabMockRequest mockRequest = NewznabMockRequest.builder().numberOfResults(1).titleBase("oneresult").offset(params.getOffset()).titleWords(Collections.emptyList()).total(1).build();
            RssRoot rssRoot = NewznabMockBuilder.generateResponse(mockRequest);
            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }

        if (params.getQ() != null && params.getQ().equals("dognzbtotaltest") && System.getProperty("nomockdognzb") == null) {
            if (params.getOffset() >= 300) {
                RssRoot rssRoot = NewznabMockBuilder.generateResponse(0, -1, itemTitleBase, false, Collections.emptyList());
                return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
            }
            NewznabMockRequest mockRequest = NewznabMockRequest.builder().numberOfResults(100).titleBase("dognzbtotaltest").offset(params.getOffset()).titleWords(Collections.emptyList()).total(300).build();
            RssRoot rssRoot = NewznabMockBuilder.generateResponse(mockRequest);
            rssRoot.getRssChannel().getNewznabResponse().setTotal(100);
            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }

        if ((params.getQ() != null && params.getQ().equals("noresults")) || (params.getTvdbid() != null && params.getTvdbid().equals("329089"))) {
            RssRoot rssRoot = NewznabMockBuilder.generateResponse(0, -1, itemTitleBase, false, Collections.emptyList());
            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }

        if (params.getQ() != null && params.getQ().equals("sleep")) {
            Thread.sleep(new Random().nextInt(5000));
        }


        if (params.getQ() != null && params.getQ().contains("movies")) {
            RssRoot rssRoot = NewznabMockBuilder.generateResponse(0, 100, itemTitleBase, false, Arrays.asList("cam", "ts", "blu-ray 2160p", "web-dl 1080p", "bluray 1080p", "3d bluray"));
            rssRoot.getRssChannel().getNewznabResponse().setTotal(100);
            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }

        if (params.getTmdbid() != null) {
            if (itemTitleBase.equals("tmdberror")) {
                RssError rssError = new RssError("123", "description");
                return new ResponseEntity<Object>(rssError, HttpStatus.OK);
            }

            RssRoot rssRoot = NewznabMockBuilder.generateResponse(0, 10, "avengers", "duplicates".equals(params.getQ()), Collections.emptyList());
            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }

        if (params.getImdbid() != null) {
            RssRoot rssRoot = NewznabMockBuilder.generateResponse(0, 10, "avengers", "duplicates".equals(params.getQ()), Collections.emptyList());
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
            RssRoot rssRoot = NewznabMockBuilder.generateResponse(0, Math.min(params.getOffset() + params.getLimit(), endIndex), itemTitleBase, "duplicates".equals(params.getQ()), Collections.emptyList());
            rssRoot.getRssChannel().getNewznabResponse().setTotal(endIndex);

            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }
    }

    @RequestMapping(value = "/torznab/api", produces = MediaType.TEXT_XML_VALUE)
    public ResponseEntity<? extends Object> torznabapi(NewznabParameters params) throws Exception {
        RssRoot rssRoot = NewznabMockBuilder.generateResponse(0, 10, "torznab", false, Collections.emptyList());
        for (RssItem item : rssRoot.getRssChannel().getItems()) {
            item.setNewznabAttributes(new ArrayList<>());
            item.getTorznabAttributes().add(new NewznabAttribute("seeders", "123"));
            item.getTorznabAttributes().add(new NewznabAttribute("peers", "456"));
            item.setCategory("5000");
            item.setGrabs(null);
        }
        return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
    }


}