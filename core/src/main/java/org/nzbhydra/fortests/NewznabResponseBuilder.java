package org.nzbhydra.fortests;


import org.nzbhydra.mapping.newznab.Enclosure;
import org.nzbhydra.mapping.newznab.NewznabAttribute;
import org.nzbhydra.mapping.newznab.NewznabResponse;
import org.nzbhydra.mapping.newznab.RssChannel;
import org.nzbhydra.mapping.newznab.RssGuid;
import org.nzbhydra.mapping.newznab.RssItem;
import org.nzbhydra.mapping.newznab.RssRoot;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

public class NewznabResponseBuilder {


    private static int numberOfDifferentTitles = 10;
    private static int numberOfDuplicatesPerTitle = 2;
    Random random = new Random();

    public RssRoot getTestResult(int startCount, int endCount, String itemTitleBase, Integer offset, Integer total) {

        RssRoot rssRoot = new RssRoot();
        rssRoot.setVersion("2.0");
        RssChannel channel = new RssChannel();
        channel.setTitle("channelTitle");
        channel.setDescription("channelDescription");
        channel.setLanguage("en-gb");
        channel.setWebMaster("webmaster@master.com");
        channel.setLink("http://www.link.xyz");
        channel.setNewznabResponse(new NewznabResponse(offset == null ? startCount - 1 : offset, total == null ? endCount : total));

        List<RssItem> items = new ArrayList<>();
        for (int i = startCount; i <= endCount; i++) {

            RssItem item = new RssItem();
            item.setDescription("Some longer itemDescription that whatever" + i);
            item.setTitle(itemTitleBase + i);
            item.setPubDate(Instant.now().minus(random.nextInt(1000), ChronoUnit.HOURS));
            item.setEnclosure(new Enclosure("enclosureUrl", 5L));
            item.setComments("http://www.comments.com/" + i);
            item.setLink("http://www.link.com/" + i);
            item.setCategory("category");
            item.setRssGuid(new RssGuid("http://www.guid.com/" + i, true));

            List<NewznabAttribute> attributes = new ArrayList<>();
            attributes.add(new NewznabAttribute("category", "7000"));
            attributes.add(new NewznabAttribute("size", String.valueOf(random.nextInt())));
            attributes.add(new NewznabAttribute("guid", "attributeGuid" + i));
            attributes.add(new NewznabAttribute("poster", "poster"));
            attributes.add(new NewznabAttribute("group", "group"));
            item.setAttributes(attributes);

            items.add(item);
        }
        channel.setItems(items);

        rssRoot.setRssChannel(channel);

        return rssRoot;
    }


}
