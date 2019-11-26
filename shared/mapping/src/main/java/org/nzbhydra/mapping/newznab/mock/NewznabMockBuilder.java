package org.nzbhydra.mapping.newznab.mock;

import org.nzbhydra.mapping.newznab.xml.*;
import org.nzbhydra.mapping.newznab.xml.caps.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Random;

public class NewznabMockBuilder {

    static Random random = new Random();
    private static final List<Integer> newznabCategories = Arrays.asList(1000, 7020, 7020);

    public static CapsXmlRoot getCaps() {
        CapsXmlRoot capsRoot = new CapsXmlRoot();
        capsRoot.setLimits(new CapsXmlLimits(100, 100));
        capsRoot.setRetention(new CapsXmlRetention(2000));
        CapsXmlSearching searching = new CapsXmlSearching();
        searching.setSearch(new CapsXmlSearch("yes", "q,cat,limit"));
        searching.setTvSearch(new CapsXmlSearch("yes", "q,tmdb,tvmazeid"));
        capsRoot.setSearching(searching);
        CapsXmlCategories capsCategories = new CapsXmlCategories(Arrays.asList(
            new CapsXmlCategory(2000, "Movies", Arrays.asList(new CapsXmlCategory(2030, "Movies HD"))),
            new CapsXmlCategory(7000, "Other", Arrays.asList(new CapsXmlCategory(7020, "EBook"))),
            new CapsXmlCategory(9000, "Misc", Arrays.asList(new CapsXmlCategory(9090, "Anime")))
        ));
        capsRoot.setCategories(capsCategories);
        return capsRoot;
    }

    public static NewznabXmlRoot generateResponse(NewznabMockRequest request) {
        List<NewznabXmlItem> items = new ArrayList<>();
        for (int i = request.getOffset() + 1; i <= request.getOffset() + request.getNumberOfResults(); i++) {

            NewznabXmlItem item = new NewznabXmlItem();
            String size = String.valueOf(Math.abs(random.nextInt(999999999)));
            String poster = "poster";
            String group = "group";
            Instant pubDate = Instant.now().minus(i, ChronoUnit.DAYS); //The higher the index the older they get
            String title = "indexer" + request.getTitleBase() + "-" + i;
            if (!request.getTitleWords().isEmpty()) {
                title += " " + request.getTitleWords().get(random.nextInt(request.getTitleWords().size()));
            }
            if (request.isGenerateDuplicates() || request.isGenerateOneDuplicate()) {
                if (random.nextBoolean() || request.isGenerateOneDuplicate()) {
                    size = "1000000";
                    title = "aDuplicate";
                }
            } else {
                poster = poster + String.valueOf(random.nextInt());
            }

            item.setDescription("indexer " + request.getTitleBase() + "-" + i + " offset " + request.getOffset());
            item.setTitle(title);
            item.setPubDate(pubDate);
            String guid = "http://127.0.0.1:5080/nzb/" + request.getTitleBase() + i;
            item.setEnclosure(new NewznabXmlEnclosure(guid, Long.valueOf(size), "application/x-nzb"));
            item.setComments("http://127.0.0.1:5080/comments/" + i);
            item.setLink(guid);
            item.setCategory("TV > HD");
            item.setRssGuid(new NewznabXmlGuid(guid, true));

            List<NewznabAttribute> attributes = new ArrayList<>();
            attributes.add(new NewznabAttribute("category", request.getNewznabCategory() != null ? request.getNewznabCategory() : String.valueOf(newznabCategories.get(random.nextInt(newznabCategories.size())))));
            attributes.add(new NewznabAttribute("size", size));
            attributes.add(new NewznabAttribute("guid", guid));

            attributes.add(new NewznabAttribute("poster", poster));
            attributes.add(new NewznabAttribute("group", group));
            attributes.add(new NewznabAttribute("grabs", String.valueOf(random.nextInt(1000))));
            if (random.nextBoolean()) {
                attributes.add(new NewznabAttribute("nfo", String.valueOf(random.nextInt(2))));
            }
            item.setNewznabAttributes(attributes);

            if (request.isTorznab()) {
                item.setGrabs(i * 2);
                List<NewznabAttribute> torznabAttributes = new ArrayList<>();
                torznabAttributes.add(new NewznabAttribute("seeders", String.valueOf(i)));
                torznabAttributes.add(new NewznabAttribute("peers", String.valueOf(i * 2)));
                torznabAttributes.add(new NewznabAttribute("size", size));
                item.setTorznabAttributes(torznabAttributes);
            }

            items.add(item);
        }

        NewznabXmlRoot rssRoot = getRssRoot(items, request.getOffset(), request.getTotal());
        return rssRoot;
    }

    public static NewznabXmlRoot getRssRoot(List<NewznabXmlItem> items, int offset, int total) {
        NewznabXmlRoot rssRoot = new NewznabXmlRoot();
        rssRoot.setVersion("2.0");
        NewznabXmlChannel channel = new NewznabXmlChannel();
        channel.setTitle("channelTitle");
        channel.setDescription("channelDescription");
        channel.setLanguage("en-gb");
        channel.setWebMaster("webmaster@master.com");
        channel.setLink("http://127.0.0.1:5080");
        channel.setNewznabResponse(new NewznabXmlResponse(offset, total));
        channel.setItems(items);
        rssRoot.setRssChannel(channel);
        return rssRoot;
    }


    public static NewznabXmlRoot generateResponse(int startIndex, int endIndex, String itemTitleBase, boolean generateDuplicates, List<String> titleWords, boolean torznab, int offset) {
        return generateResponse(
            NewznabMockRequest.builder()
                .numberOfResults(endIndex - startIndex)
                .titleBase(itemTitleBase)
                .generateDuplicates(generateDuplicates)
                .titleWords(titleWords)
                .torznab(torznab)
                .offset(offset)
                .build()
        );
    }

}
