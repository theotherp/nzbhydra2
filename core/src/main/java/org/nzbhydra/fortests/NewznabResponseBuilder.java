package org.nzbhydra.fortests;


import org.nzbhydra.mapping.newznab.xml.NewznabAttribute;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlChannel;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlEnclosure;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlGuid;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlResponse;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

public class NewznabResponseBuilder {


    private static int numberOfDifferentTitles = 10;
    private static int numberOfDuplicatesPerTitle = 2;
    Random random = new Random();

    public NewznabXmlRoot getTestResult(int startCount, int endCount, String itemTitleBase, Integer offset, Integer total) {

        NewznabXmlRoot rssRoot = new NewznabXmlRoot();
        rssRoot.setVersion("2.0");
        NewznabXmlChannel channel = new NewznabXmlChannel();
        channel.setTitle("channelTitle");
        channel.setDescription("channelDescription");
        channel.setLanguage("en-gb");
        channel.setWebMaster("webmaster@master.com");
        channel.setLink("http://www.link.xyz");
        channel.setNewznabResponse(new NewznabXmlResponse(offset == null ? startCount - 1 : offset, total == null ? endCount : total));

        List<NewznabXmlItem> items = new ArrayList<>();
        for (int i = startCount; i <= endCount; i++) {

            NewznabXmlItem item = new NewznabXmlItem();
            item.setDescription("Some longer itemDescription that whatever" + i);
            item.setTitle(itemTitleBase + i);
            item.setPubDate(Instant.now().minus(i * 1000, ChronoUnit.HOURS));
            item.setEnclosure(new NewznabXmlEnclosure("enclosureUrl", 5L, "application/x-nzb"));
            item.setComments("http://www.comments.com/" + i);
            item.setLink("http://www.link.com/" + i);
            item.setCategory("category");
            item.setRssGuid(new NewznabXmlGuid("http://www."+itemTitleBase +".com/" + i, true));

            List<NewznabAttribute> attributes = new ArrayList<>();
            attributes.add(new NewznabAttribute("category", "7000"));
            attributes.add(new NewznabAttribute("size", String.valueOf(random.nextInt())));
            attributes.add(new NewznabAttribute("guid", "attributeGuid" + i));
            attributes.add(new NewznabAttribute("poster", "poster"));
            attributes.add(new NewznabAttribute("group", "group"));
            item.setNewznabAttributes(attributes);

            items.add(item);
        }
        channel.setItems(items);

        rssRoot.setRssChannel(channel);

        return rssRoot;
    }


}
