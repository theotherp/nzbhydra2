

package org.nzbhydra.mapping.newznab.xml.caps;

import jakarta.xml.bind.annotation.XmlAccessType;
import jakarta.xml.bind.annotation.XmlAccessorType;
import jakarta.xml.bind.annotation.XmlAttribute;
import jakarta.xml.bind.annotation.XmlRootElement;
import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;


@XmlRootElement(name = "limits")
@XmlAccessorType(XmlAccessType.FIELD)
@Data
@ReflectionMarker
public class CapsXmlLimits {

    public CapsXmlLimits() {
    }

    public CapsXmlLimits(Integer max, Integer defaultValue) {
        this.max = max;
        this.defaultValue = defaultValue;
    }

    @XmlAttribute
    private Integer max;

    @XmlAttribute(name = "default")
    private Integer defaultValue;


}
