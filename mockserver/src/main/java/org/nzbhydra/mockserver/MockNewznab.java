package org.nzbhydra.mockserver;

import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mapping.newznab.Enclosure;
import org.nzbhydra.mapping.newznab.NewznabAttribute;
import org.nzbhydra.mapping.newznab.NewznabParameters;
import org.nzbhydra.mapping.newznab.NewznabResponse;
import org.nzbhydra.mapping.newznab.RssChannel;
import org.nzbhydra.mapping.newznab.RssGuid;
import org.nzbhydra.mapping.newznab.RssItem;
import org.nzbhydra.mapping.newznab.RssRoot;
import org.nzbhydra.mapping.newznab.TorznabAttribute;
import org.nzbhydra.mapping.newznab.caps.CapsCategories;
import org.nzbhydra.mapping.newznab.caps.CapsCategory;
import org.nzbhydra.mapping.newznab.caps.CapsLimits;
import org.nzbhydra.mapping.newznab.caps.CapsRetention;
import org.nzbhydra.mapping.newznab.caps.CapsRoot;
import org.nzbhydra.mapping.newznab.caps.CapsSearch;
import org.nzbhydra.mapping.newznab.caps.CapsSearching;
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
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Random;

@SuppressWarnings("ALL")
@RestController
public class MockNewznab {

    private static final Logger logger = LoggerFactory.getLogger(MockNewznab.class);

    Random random = new Random();
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

    @RequestMapping(value = "/api", produces = MediaType.TEXT_XML_VALUE)
    public ResponseEntity<? extends Object> api(NewznabParameters params) throws Exception {

        if (params.getT() == ActionAttribute.CAPS) {
            return getCaps();
        }

        if (params.getT() == ActionAttribute.GETNFO) {
            RssRoot rssRoot = new RssRoot();
            rssRoot.getRssChannel().setNewznabResponse(new NewznabResponse(0, 1));
            RssItem item = new RssItem();
            item.setDescription("NFO for NZB with ID " + params.getId());
            rssRoot.getRssChannel().getItems().add(item);
            return ResponseEntity.ok(rssRoot);
        }

        int count;
        int key = 0;
        try {
            key = Integer.valueOf(params.getApikey());
        } catch (NumberFormatException e) {
            count = 0;
        }
        if (apikeyToResultCount.containsKey(key)) {
            count = apikeyToResultCount.get(key);
        } else {
            count = 0;
        }

        if (responsesPerApikey.containsKey(count)) {
            return new ResponseEntity<Object>(responsesPerApikey.get(count), HttpStatus.OK);
        } else {
            RssRoot rssRoot = generateResponse(count, params.getApikey());
            responsesPerApikey.put(count, rssRoot);
            return new ResponseEntity<Object>(rssRoot, HttpStatus.OK);
        }
    }

    private ResponseEntity<?> getCaps() {
        CapsRoot capsRoot = new CapsRoot();
        capsRoot.setLimits(new CapsLimits(100, 100));
        capsRoot.setRetention(new CapsRetention(2000));
        CapsSearching searching = new CapsSearching();
        searching.setSearch(new CapsSearch("yes", "q,cat,limit"));
        searching.setTvSearch(new CapsSearch("yes", "q,tmdb,tvmazeid"));
        capsRoot.setSearching(searching);
        CapsCategories capsCategories = new CapsCategories(Arrays.asList(
                new CapsCategory(2000, "Movies", Arrays.asList(new CapsCategory(2030, "Movies HD"))),
                new CapsCategory(7000, "Other", Arrays.asList(new CapsCategory(7020, "EBook")))
        ));
        capsRoot.setCategories(capsCategories);
        return new ResponseEntity<Object>(capsRoot, HttpStatus.OK);
    }


    private RssRoot generateResponse(int endCount, String itemTitleBase) {

        RssRoot rssRoot = new RssRoot();
        rssRoot.setVersion("2.0");
        RssChannel channel = new RssChannel();
        channel.setTitle("channelTitle");
        channel.setDescription("channelDescription");
        channel.setLanguage("en-gb");
        channel.setWebMaster("webmaster@master.com");
        channel.setLink("http://127.0.0.1:5080");
        channel.setNewznabResponse(new NewznabResponse(0, endCount));

        List<RssItem> items = new ArrayList<>();
        for (int i = 1; i <= endCount; i++) {

            RssItem item = new RssItem();
            item.setDescription("Some longer itemDescription that whatever" + i);
            item.setTitle("indexer" + itemTitleBase + "-" + i);
            item.setPubDate(Instant.now().minus(random.nextInt(1000), ChronoUnit.HOURS));
            item.setEnclosure(new Enclosure("enclosureUrl", 5L));
            item.setComments("http://127.0.0.1:5080/comments/" + i);
            item.setLink("http://127.0.0.1:5080/details/" + i);
            item.setCategory("7000");
            item.setRssGuid(new RssGuid("http://127.0.0.1:5080/nzb/" + i, true));

            List<NewznabAttribute> attributes = new ArrayList<>();
            attributes.add(new NewznabAttribute("category", "7000"));
            attributes.add(new NewznabAttribute("size", String.valueOf(random.nextInt())));
            attributes.add(new NewznabAttribute("guid", "attributeGuid" + i));
            attributes.add(new NewznabAttribute("poster", "poster"));
            attributes.add(new NewznabAttribute("group", "group"));
            attributes.add(new NewznabAttribute("grabs", String.valueOf(random.nextInt(1000))));
            item.setNewznabAttributes(attributes);

            item.setGrabs(i * 2);
            List<TorznabAttribute> torznabAttributes = new ArrayList<>();
            torznabAttributes.add(new TorznabAttribute("seeders", String.valueOf(i)));
            torznabAttributes.add(new TorznabAttribute("peers", String.valueOf(i * 2)));
            torznabAttributes.add(new TorznabAttribute("size", String.valueOf(random.nextInt())));
            item.setTorznabAttributes(torznabAttributes);

            items.add(item);
        }
        channel.setItems(items);

        rssRoot.setRssChannel(channel);
        return rssRoot;
    }
}