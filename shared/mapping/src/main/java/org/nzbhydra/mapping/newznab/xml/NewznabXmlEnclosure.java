

package org.nzbhydra.mapping.newznab.xml;

import jakarta.xml.bind.annotation.XmlAccessType;
import jakarta.xml.bind.annotation.XmlAccessorType;
import jakarta.xml.bind.annotation.XmlAttribute;
import jakarta.xml.bind.annotation.XmlRootElement;
import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;


@XmlRootElement(name = "guid")
@XmlAccessorType(XmlAccessType.FIELD)
@Data
@ReflectionMarker
public class NewznabXmlEnclosure {

    public NewznabXmlEnclosure() {
    }

    public NewznabXmlEnclosure(String url, Long length, String type) {
        this.url = url;
        this.length = length;
        this.type = type;
    }

    @XmlAttribute
    private String url;

    @XmlAttribute
    private Long length;

    @XmlAttribute
    private String type;


}
