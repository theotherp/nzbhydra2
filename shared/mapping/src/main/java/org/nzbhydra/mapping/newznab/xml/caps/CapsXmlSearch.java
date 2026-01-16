

package org.nzbhydra.mapping.newznab.xml.caps;

import jakarta.xml.bind.annotation.XmlAccessType;
import jakarta.xml.bind.annotation.XmlAccessorType;
import jakarta.xml.bind.annotation.XmlAttribute;
import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;


@XmlAccessorType(XmlAccessType.FIELD)
@Data
@ReflectionMarker
public class CapsXmlSearch {

    public CapsXmlSearch() {
    }

    public CapsXmlSearch(String available, String supportedParams) {
        this.available = available;
        this.supportedParams = supportedParams;
    }

    @XmlAttribute
    private String available;

    @XmlAttribute
    private String supportedParams;

    public boolean isAvailable() {
        return "yes".equals(available);
    }


}
