package org.nzbhydra.mapping.newznab.mock;

import org.nzbhydra.mapping.newznab.caps.*;
import org.nzbhydra.mapping.newznab.xml.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Random;

public class NewznabMockBuilder {

    static Random random = new Random();
    private static final List<Integer> newznabCategories = Arrays.asList(1000, 2000, 5000, 5040, 5035, 9090, 9000, 7020, 2030);

    public static CapsRoot getCaps() {
        CapsRoot capsRoot = new CapsRoot();
        capsRoot.setLimits(new CapsLimits(100, 100));
        capsRoot.setRetention(new CapsRetention(2000));
        CapsSearching searching = new CapsSearching();
        searching.setSearch(new CapsSearch("yes", "q,cat,limit"));
        searching.setTvSearch(new CapsSearch("yes", "q,tmdb,tvmazeid"));
        capsRoot.setSearching(searching);
        CapsCategories capsCategories = new CapsCategories(Arrays.asList(
                new CapsCategory(2000, "Movies", Arrays.asList(new CapsCategory(2030, "Movies HD"))),
                new CapsCategory(7000, "Other",Arrays.asList(new CapsCategory(7020, "EBook"))),
                new CapsCategory(9000, "Misc",  Arrays.asList(new CapsCategory(9090, "Anime")))
        ));
        capsRoot.setCategories(capsCategories);
        return capsRoot;
    }

    public static NewznabXmlRoot generateResponse(NewznabMockRequest request) {
        List<NewznabXmlItem> items = new ArrayList<>();
        for (int i = request.getOffset()+1; i <= request.getOffset() + request.getNumberOfResults(); i++) {

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

            item.setDescription("Some longer itemDescription that whatever" + i);
            item.setTitle(title);
            item.setPubDate(pubDate);
            item.setEnclosure(new NewznabXmlEnclosure("enclosureUrl", Long.valueOf(size), "application/x-nzb"));
            item.setComments("http://127.0.0.1:5080/comments/" + i);
            String guid = "http://127.0.0.1:5080/nzb/" + request.getTitleBase() + i;
            item.setLink(guid);
            item.setCategory("TV > HD");
            item.setRssGuid(new NewznabXmlGuid(guid, true));

            List<NewznabAttribute> attributes = new ArrayList<>();
            attributes.add(new NewznabAttribute("category", String.valueOf(newznabCategories.get(random.nextInt(newznabCategories.size())))));
            attributes.add(new NewznabAttribute("size", size));
            attributes.add(new NewznabAttribute("guid", guid));

            attributes.add(new NewznabAttribute("poster", poster));
            attributes.add(new NewznabAttribute("group", group));
            attributes.add(new NewznabAttribute("grabs", String.valueOf(random.nextInt(1000))));
            if (random.nextBoolean()) {
                attributes.add(new NewznabAttribute("nfo", String.valueOf(random.nextInt(2))));
            }
            item.setNewznabAttributes(attributes);

            item.setGrabs(i * 2);
            List<NewznabAttribute> torznabAttributes = new ArrayList<>();
            torznabAttributes.add(new NewznabAttribute("seeders", String.valueOf(i)));
            torznabAttributes.add(new NewznabAttribute("peers", String.valueOf(i * 2)));
            torznabAttributes.add(new NewznabAttribute("size", size));
            item.setTorznabAttributes(torznabAttributes);

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


    public static NewznabXmlRoot generateResponse(int startIndex, int endIndex, String itemTitleBase, boolean generateDuplicates, List<String> titleWords) {
        return generateResponse(
                NewznabMockRequest.builder()
                        .numberOfResults(endIndex - startIndex)
                        .titleBase(itemTitleBase)
                        .generateDuplicates(generateDuplicates)
                        .titleWords(titleWords)
                        .build()
        );
    }

}
