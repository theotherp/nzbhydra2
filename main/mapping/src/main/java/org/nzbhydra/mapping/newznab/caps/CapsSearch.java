package org.nzbhydra.mapping.newznab.caps;

import lombok.Data;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlAttribute;

@XmlAccessorType(XmlAccessType.FIELD)
@Data
public class CapsSearch {

    public CapsSearch() {
    }

    public CapsSearch(String available, String supportedParams) {
        this.available = available;
        this.supportedParams = supportedParams;
    }

    @XmlAttribute
    private String available;

    @XmlAttribute
    private String supportedParams;


}
