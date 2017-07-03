package org.nzbhydra.mapping.newznab.caps;

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

    @XmlElement(name = "tv-search")
    private CapsSearch tvSearch;

    @XmlElement(name = "movie-search")
    private CapsSearch movieSearch;

    @XmlElement(name = "audio-search")
    private CapsSearch audioSearch;

    @XmlElement(name = "book-search")
    private CapsSearch bookSearch;


}
