

package org.nzbhydra.mapping.newznab.xml.caps;

import jakarta.xml.bind.annotation.XmlAccessType;
import jakarta.xml.bind.annotation.XmlAccessorType;
import jakarta.xml.bind.annotation.XmlElement;
import jakarta.xml.bind.annotation.XmlRootElement;
import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;


@XmlAccessorType(XmlAccessType.FIELD)
@XmlRootElement(name = "searching")
@Data
@ReflectionMarker
public class CapsXmlSearching {

    @XmlElement(name = "search")
    private CapsXmlSearch search;

    @XmlElement(name = "tv-search")
    private CapsXmlSearch tvSearch;

    @XmlElement(name = "movie-search")
    private CapsXmlSearch movieSearch;

    @XmlElement(name = "audio-search")
    private CapsXmlSearch audioSearch;

    @XmlElement(name = "book-search")
    private CapsXmlSearch bookSearch;


}
