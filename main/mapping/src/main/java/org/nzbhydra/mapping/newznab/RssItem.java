package org.nzbhydra.mapping.newznab;

import lombok.Data;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlElement;
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.adapters.XmlJavaTypeAdapter;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@XmlAccessorType(XmlAccessType.FIELD)
@XmlRootElement(name = "item")
@Data
public class RssItem {


    @XmlElement(name = "title")
    private String title;

    @XmlElement(name = "link")
    private String link;

    @XmlElement(name = "pubDate")
    @XmlJavaTypeAdapter(JaxbPubdateAdapter.class)
    private Instant pubDate;

    @XmlElement(name = "guid")
    private RssGuid rssGuid;

    @XmlElement(name = "description")
    private String description;

    @XmlElement(name = "comments")
    private String comments;

    @XmlElement(name = "category")
    private String category;

    @XmlElement(name = "grabs") //Only set by torznab
    private Integer grabs;

    @XmlElement(name = "attr", namespace = "http://www.newznab.com/DTD/2010/feeds/attributes/")
    private List<NewznabAttribute> newznabAttributes = new ArrayList<>();

    @XmlElement(name = "attr", namespace = "http://torznab.com/schemas/2015/feed")
    private List<NewznabAttribute> torznabAttributes = new ArrayList<>();

    @XmlElement(name = "enclosure")
    private Enclosure enclosure;

}
