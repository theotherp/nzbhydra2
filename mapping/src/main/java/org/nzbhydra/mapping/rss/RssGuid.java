package org.nzbhydra.mapping.rss;

import lombok.Data;

import javax.xml.bind.annotation.*;

@XmlRootElement(name = "guid")
@XmlAccessorType(XmlAccessType.FIELD)
@Data
public class RssGuid {

    public RssGuid() {

    }

    public RssGuid(String guid, Boolean isPermaLink) {
        this.guid = guid;
        this.isPermaLink = isPermaLink;
    }

    @XmlValue
    private String guid;

    @XmlAttribute
    private Boolean isPermaLink;


}
