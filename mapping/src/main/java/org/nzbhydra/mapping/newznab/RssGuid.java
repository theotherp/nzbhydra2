package org.nzbhydra.mapping.newznab;

import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlProperty;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlText;
import lombok.Data;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlRootElement;

@XmlRootElement(name = "guid")
@XmlAccessorType(XmlAccessType.FIELD)
@Data
public class RssGuid {

    public RssGuid() {
    }

    public RssGuid(String guid) {
        this.guid = guid;
    }

    public RssGuid(String guid, boolean isPermaLink) {
        this.guid = guid;
        this.isPermaLink = isPermaLink;
    }

    //@XmlValue
    @JacksonXmlText
    private String guid;

    @JacksonXmlProperty(isAttribute = true)
    private boolean isPermaLink = false;


}
