package org.nzbhydra.mapping.newznab;

import lombok.Data;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlAttribute;
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlValue;

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
