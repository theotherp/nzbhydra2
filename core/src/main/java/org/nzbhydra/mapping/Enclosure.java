package org.nzbhydra.mapping;

import lombok.Data;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlAttribute;
import javax.xml.bind.annotation.XmlRootElement;

@XmlRootElement(name = "guid")
@XmlAccessorType(XmlAccessType.FIELD)
@Data
public class Enclosure {

    public Enclosure() {
    }

    public Enclosure(String url, Long length) {
        this.url = url;
        this.length = length;
        this.type = "application/x-nzb";
    }

    @XmlAttribute
    private String url;

    @XmlAttribute
    private Long length;

    @XmlAttribute
    private String type;




}
