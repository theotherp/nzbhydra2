package org.nzbhydra.mapping.newznab;

import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlElementWrapper;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlProperty;
import lombok.Data;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import java.util.ArrayList;
import java.util.List;

@XmlAccessorType(XmlAccessType.FIELD)
@Data
public class RssChannel {

    private String title;
    private String description;
    private String link;
    private String language;
    private String webMaster;
    private String generator;

    //@XmlElement(name = "response", namespace = "http://www.newznab.com/DTD/2010/feeds/attributes/")
    @JacksonXmlProperty(localName = "response", namespace = "http://www.newznab.com/DTD/2010/feeds/attributes/")
    private NewznabResponse newznabResponse;


    @JacksonXmlProperty(localName = "item")
    @JacksonXmlElementWrapper(useWrapping = false)
    private List<RssItem> items = new ArrayList<>();

}
