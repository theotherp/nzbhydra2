package org.nzbhydra.rssmapping;

import lombok.Data;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlAttribute;
import javax.xml.bind.annotation.XmlRootElement;

@XmlRootElement(name = "error")
@XmlAccessorType(XmlAccessType.FIELD)
@Data
public class RssError extends Xml {

    @XmlAttribute
    private String code;

    @XmlAttribute
    private String description;
}
