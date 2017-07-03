package org.nzbhydra.mapping.newznab;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlElementWrapper;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlElement;
import javax.xml.bind.annotation.XmlRootElement;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@XmlAccessorType(XmlAccessType.FIELD)
@XmlRootElement(name="item")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RssItem {

    @XmlElement(name = "title")
    private String title;

    @XmlElement(name = "link")
    private String link;

    @XmlElement(name = "pubDate")
    @JsonDeserialize(using = PubdateDeserializer.class)
    @JsonSerialize(using = PubdateSerializer.class)
    private Instant pubDate;

    @XmlElement(name= "guid")
    @JacksonXmlProperty(localName = "guid")
    private RssGuid rssGuid;

    @XmlElement(name = "description")
    private String description;

    @XmlElement(name = "comments")
    private String comments;

    @XmlElement(name = "category")
    private String category;

    @XmlElement(name = "grabs") //Only set by torznab
    private Integer grabs;

    @XmlElement(name = "attr", namespace="http://www.newznab.com/DTD/2010/feeds/attributes/")
    @JacksonXmlProperty(localName = "attr", namespace = "http://www.newznab.com/DTD/2010/feeds/attributes/")
    @JacksonXmlElementWrapper(useWrapping = false)
    private List<NewznabAttribute> newznabAttributes = new ArrayList<>();

    @XmlElement(name = "attr", namespace = "http://torznab.com/schemas/2015/feed")
    @JacksonXmlElementWrapper(useWrapping = false)
    //@JacksonXmlProperty(localName = "attr", namespace = "http://torznab.com/schemas/2015/feed") //TODO jackson doesn't allow the same attribute twice
    private List<TorznabAttribute> torznabAttributes = new ArrayList<>();

    @XmlElement(name = "enclosure")
    private Enclosure enclosure;

}
