package org.nzbhydra.mapping.newznab.caps;

import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlProperty;
import lombok.Data;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlElement;
import javax.xml.bind.annotation.XmlRootElement;

@XmlAccessorType(XmlAccessType.FIELD)
@XmlRootElement(name = "searching")
@Data
public class CapsSearching {

    @XmlElement(name = "search")
    private CapsSearch search;

    @JacksonXmlProperty(localName = "tv-search")
    private CapsSearch tvSearch;

    @JacksonXmlProperty(localName = "movie-search")
    private CapsSearch movieSearch;

    @JacksonXmlProperty(localName = "audio-search")
    private CapsSearch audioSearch;

    @JacksonXmlProperty(localName = "book-search")
    private CapsSearch bookSearch;


}
