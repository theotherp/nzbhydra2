package org.nzbhydra.mapping.newznab.builder;

import org.nzbhydra.mapping.newznab.xml.NewznabXmlChannel;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlResponse;

import java.util.ArrayList;
import java.util.List;

public final class RssChannelBuilder {
    private String description = "A description";
    private String generator = "newznab";
    private List<NewznabXmlItem> items = new ArrayList<>();
    private String language = "en_US";
    private String link = "http://some.indexer";
    private NewznabXmlResponse newznabResponse = new NewznabXmlResponse(0, 200);
    private String title = "Title";
    private String webMaster = "Webmaster";

    private RssChannelBuilder() {
    }

    public static RssChannelBuilder builder() {
        return new RssChannelBuilder();
    }

    public RssChannelBuilder title(String title) {
        this.title = title;
        return this;
    }

    public RssChannelBuilder description(String description) {
        this.description = description;
        return this;
    }

    public RssChannelBuilder link(String link) {
        this.link = link;
        return this;
    }

    public RssChannelBuilder language(String language) {
        this.language = language;
        return this;
    }

    public RssChannelBuilder webMaster(String webMaster) {
        this.webMaster = webMaster;
        return this;
    }

    public RssChannelBuilder generator(String generator) {
        this.generator = generator;
        return this;
    }

    public RssChannelBuilder newznabResponse(int offset, int total) {
        this.newznabResponse = new NewznabXmlResponse(offset, total);
        return this;
    }

    public RssChannelBuilder items(List<NewznabXmlItem> items) {
        this.items = items;
        return this;
    }

    public NewznabXmlChannel build() {
        NewznabXmlChannel rssChannel = new NewznabXmlChannel();
        rssChannel.setTitle(title);
        rssChannel.setDescription(description);
        rssChannel.setLink(link);
        rssChannel.setLanguage(language);
        rssChannel.setWebMaster(webMaster);
        rssChannel.setGenerator(generator);
        rssChannel.setNewznabResponse(newznabResponse);
        rssChannel.setItems(items);
        return rssChannel;
    }
}
