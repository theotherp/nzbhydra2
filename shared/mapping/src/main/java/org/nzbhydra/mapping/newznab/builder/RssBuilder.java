package org.nzbhydra.mapping.newznab.builder;

import org.nzbhydra.mapping.newznab.xml.NewznabXmlChannel;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlResponse;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

public final class RssBuilder {
    private NewznabXmlChannel rssChannel = RssChannelBuilder.builder().build();
    private List<NewznabXmlItem> items = new ArrayList<>();


    private RssBuilder() {
    }

    public static RssBuilder builder() {
        return new RssBuilder();
    }

    public RssBuilder rssChannel(NewznabXmlChannel rssChannel) {
        this.rssChannel = rssChannel;
        return this;
    }

    public RssBuilder items(List<NewznabXmlItem> items) {
        this.items = items;
        return this;
    }

    public RssBuilder items(int count) {
        for (int i = 1; i <= count; i++) {
            this.items.add(RssItemBuilder.builder("item" + count).build());
        }
        return this;
    }

    public List<NewznabXmlItem> createDuplicates(int count) {
        List<NewznabXmlItem> duplicates = new ArrayList<>();
        Random random = new Random();
        int rnd = random.nextInt();
        long size = random.nextLong();
        Instant pubDate = Instant.now().minus(random.nextInt(100), ChronoUnit.DAYS);
        for (int i = 1; i <= count; i++) {
            duplicates.add(RssItemBuilder.builder("duplicate-" + rnd).size(size).pubDate(pubDate).poster("poster-" + rnd).group("group-" + rnd).build());
        }
        return duplicates;
    }


    public RssBuilder newznabResponse(int offset, int total) {
        this.rssChannel.setNewznabResponse(new NewznabXmlResponse(offset, total));
        return this;
    }


    public NewznabXmlRoot build() {
        NewznabXmlRoot rssRoot = new NewznabXmlRoot();
        rssChannel.getItems().addAll(items);
        rssRoot.setRssChannel(rssChannel);

        return rssRoot;
    }
}
