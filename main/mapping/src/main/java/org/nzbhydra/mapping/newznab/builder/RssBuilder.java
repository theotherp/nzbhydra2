package org.nzbhydra.mapping.newznab.builder;

import org.nzbhydra.mapping.newznab.NewznabResponse;
import org.nzbhydra.mapping.newznab.RssChannel;
import org.nzbhydra.mapping.newznab.RssItem;
import org.nzbhydra.mapping.newznab.RssRoot;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

public final class RssBuilder {
    private RssChannel rssChannel = RssChannelBuilder.builder().build();
    private List<RssItem> items = new ArrayList<>();


    private RssBuilder() {
    }

    public static RssBuilder builder() {
        return new RssBuilder();
    }

    public RssBuilder rssChannel(RssChannel rssChannel) {
        this.rssChannel = rssChannel;
        return this;
    }

    public RssBuilder items(List<RssItem> items) {
        this.items = items;
        return this;
    }

    public RssBuilder items(int count) {
        for (int i = 1; i <= count; i++) {
            this.items.add(RssItemBuilder.builder("item" + count).build());
        }
        return this;
    }

    public List<RssItem> createDuplicates(int count) {
        List<RssItem> duplicates = new ArrayList<>();
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
        this.rssChannel.setNewznabResponse(new NewznabResponse(offset, total));
        return this;
    }


    public RssRoot build() {
        RssRoot rssRoot = new RssRoot();
        rssChannel.getItems().addAll(items);
        rssRoot.setRssChannel(rssChannel);

        return rssRoot;
    }
}
