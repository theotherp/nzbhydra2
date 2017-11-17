package org.nzbhydra.mapping.newznab.caps;

import lombok.Data;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlAttribute;

@XmlAccessorType(XmlAccessType.FIELD)
@Data
public class CapsServer {

    public CapsServer() {
    }


    @XmlAttribute
    private String version;

    @XmlAttribute
    private String title;

    @XmlAttribute
    private String strapline;

    @XmlAttribute
    private String email;

    @XmlAttribute
    private String url;

    @XmlAttribute
    private String image; //LATER favicon


}
