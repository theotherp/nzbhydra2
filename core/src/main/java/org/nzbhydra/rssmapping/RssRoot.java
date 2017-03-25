package org.nzbhydra.rssmapping;

import lombok.Data;

import javax.xml.bind.annotation.*;

@XmlRootElement(name = "rss")
@XmlAccessorType(XmlAccessType.FIELD)
@Data
public class RssRoot extends Xml {

    @XmlAttribute
    private String version = "2.0";

    @XmlElement(name = "channel")
    private RssChannel rssChannel;

    @XmlElement(name = "error")
    private RssError error;
}
