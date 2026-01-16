

package org.nzbhydra.mapping.newznab.xml;

import jakarta.xml.bind.annotation.XmlAccessType;
import jakarta.xml.bind.annotation.XmlAccessorType;
import jakarta.xml.bind.annotation.XmlAttribute;
import jakarta.xml.bind.annotation.XmlRootElement;
import jakarta.xml.bind.annotation.XmlValue;
import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;


@XmlRootElement(name = "guid")
@XmlAccessorType(XmlAccessType.FIELD)
@Data
@ReflectionMarker
public class NewznabXmlGuid {

    public NewznabXmlGuid() {

    }

    public NewznabXmlGuid(String guid, boolean isPermaLink) {
        this.guid = guid;
        this.isPermaLink = isPermaLink;
    }

    @XmlValue
    private String guid;

    @XmlAttribute
    private boolean isPermaLink = false;


}
