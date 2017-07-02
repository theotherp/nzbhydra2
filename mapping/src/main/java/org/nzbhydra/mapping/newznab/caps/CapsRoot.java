package org.nzbhydra.mapping.newznab.caps;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlProperty;
import lombok.Data;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlElement;
import javax.xml.bind.annotation.XmlRootElement;
import java.util.ArrayList;

@XmlAccessorType(XmlAccessType.FIELD)
@XmlRootElement(name = "caps")
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class CapsRoot {

    @XmlElement
    private CapsServer server;

    @XmlElement
    private CapsLimits limits;

    @XmlElement
    private CapsRetention retention;

    @XmlElement
    private CapsSearching searching;

    @JacksonXmlProperty(localName = "categories")
    private CapsCategories categories = new CapsCategories(new ArrayList<>());


}
