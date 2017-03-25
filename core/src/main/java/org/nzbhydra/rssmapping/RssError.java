package org.nzbhydra.rssmapping;

import lombok.Data;
import lombok.NoArgsConstructor;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlAttribute;
import javax.xml.bind.annotation.XmlRootElement;

@XmlRootElement(name = "error")
@XmlAccessorType(XmlAccessType.FIELD)
@NoArgsConstructor
@Data
public class RssError extends Xml {

    @XmlAttribute
    private String code;

    @XmlAttribute
    private String description;

    public RssError(String code, String description) {
        this.code = code;
        this.description = description;
    }


}
