package org.nzbhydra.mapping;

import lombok.Data;

import javax.xml.bind.annotation.*;

@XmlRootElement(name = "rss")
@XmlAccessorType(XmlAccessType.FIELD)
@Data
public class RssRoot {

    @XmlAttribute
    private String version = "2.0";

    @XmlElement(name = "channel")
    private RssChannel rssChannel;
}
