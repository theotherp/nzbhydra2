package org.nzbhydra.mapping.newznab.builder;

import org.nzbhydra.mapping.newznab.xml.JaxbPubdateAdapter;
import org.nzbhydra.mapping.newznab.xml.NewznabAttribute;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlEnclosure;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlGuid;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

public final class RssItemBuilder {

    private static Random random = new Random();

    private String category = "category";
    private String comments = "http://some.comments";
    private String description = "A description";
    private NewznabXmlEnclosure enclosure = null;
    private Integer grabs = 10;
    private String link = "http://some.link";
    private List<NewznabAttribute> newznabAttributes = new ArrayList<>();
    private List<NewznabAttribute> torznabAttributes = new ArrayList<>();
    private Instant pubDate = Instant.now().minus(random.nextInt(500), ChronoUnit.DAYS);
    private NewznabXmlGuid rssGuid = new NewznabXmlGuid("guid" + random.nextInt(), false);
    private String title = "title-rnd" + random.nextInt();
    private long size = random.nextLong();

    private RssItemBuilder() {
    }

    public static RssItemBuilder builder() {
        RssItemBuilder builder = new RssItemBuilder();
        return builder;
    }

    public static RssItemBuilder builder(String title) {
        RssItemBuilder builder = new RssItemBuilder();
        builder.title(title);
        return builder;
    }


    public RssItemBuilder title(String title) {
        this.title = title;
        return this;
    }

    public RssItemBuilder link(String link) {
        this.link = link;
        return this;
    }

    public RssItemBuilder size(long size) {
        this.size = size;
        return this;
    }

    public RssItemBuilder pubDate(Instant pubDate) {
        this.pubDate = pubDate;
        return this;
    }

    public RssItemBuilder rssGuid(NewznabXmlGuid rssGuid) {
        this.rssGuid = rssGuid;
        return this;
    }

    public RssItemBuilder description(String description) {
        this.description = description;
        return this;
    }

    public RssItemBuilder comments(String comments) {
        this.comments = comments;
        return this;
    }

    public RssItemBuilder category(String category) {
        this.category = category;
        return this;
    }

    public RssItemBuilder grabs(Integer grabs) {
        this.grabs = grabs;
        return this;
    }

    public RssItemBuilder newznabAttributes(List<NewznabAttribute> newznabAttributes) {
        this.newznabAttributes.addAll(newznabAttributes);
        return this;
    }

    public RssItemBuilder torznabAttributes(List<NewznabAttribute> torznabAttributes) {
        this.torznabAttributes.addAll(torznabAttributes);
        return this;
    }

    public RssItemBuilder enclosure(NewznabXmlEnclosure enclosure) {
        this.enclosure = enclosure;
        return this;
    }

    public RssItemBuilder hasNfo(boolean hasNfo) {
        newznabAttributes.add(new NewznabAttribute("nfo", hasNfo ? "1" : "0"));
        return this;
    }

    public RssItemBuilder poster(String poster) {
        newznabAttributes.add(new NewznabAttribute("poster", poster));
        return this;
    }

    public RssItemBuilder group(String group) {
        newznabAttributes.add(new NewznabAttribute("group", group));
        return this;
    }

    public RssItemBuilder linksFromBaseUrl(String baseUrl) {
        comments = "http://127.0.0.1:5080/comments/" + title;
        link = "http://127.0.0.1:5080/details/" + title;
        return this;
    }

    public RssItemBuilder categoryNewznab(String... categories) {
        for (String s : categories) {
            newznabAttributes.add(new NewznabAttribute("category", s));
        }
        return this;
    }


    public NewznabXmlItem build() {
        NewznabXmlItem rssItem = new NewznabXmlItem();
        rssItem.setTitle(title);
        rssItem.setLink(link);
        rssItem.setPubDate(pubDate);
        rssItem.setDescription(description);
        rssItem.setComments(comments);
        rssItem.setCategory(category);
        rssItem.setGrabs(grabs);
        rssItem.setNewznabAttributes(newznabAttributes);
        rssItem.setTorznabAttributes(torznabAttributes);

        if (rssGuid == null) {
            rssItem.setRssGuid(new NewznabXmlGuid(title + "-guid", false));
        } else {
            rssItem.setRssGuid(rssGuid);
        }

        newznabAttributes.add(new NewznabAttribute("size", String.valueOf(size)));
        if (enclosure == null) {
            rssItem.setEnclosure(new NewznabXmlEnclosure(link, size, "application/x-nzb"));
        } else {
            rssItem.setEnclosure(enclosure);
        }

        newznabAttributes.add(new NewznabAttribute("usenetdate", new JaxbPubdateAdapter().marshal(pubDate)));
        if (grabs != null) {
            newznabAttributes.add(new NewznabAttribute("grabs", String.valueOf(grabs)));
        }
        return rssItem;
    }
}
