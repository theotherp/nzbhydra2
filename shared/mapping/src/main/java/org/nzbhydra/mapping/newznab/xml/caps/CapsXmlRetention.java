

package org.nzbhydra.mapping.newznab.xml.caps;

import jakarta.xml.bind.annotation.XmlAccessType;
import jakarta.xml.bind.annotation.XmlAccessorType;
import jakarta.xml.bind.annotation.XmlAttribute;
import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;


@XmlAccessorType(XmlAccessType.FIELD)
@Data
@ReflectionMarker
public class CapsXmlRetention {

    public CapsXmlRetention() {
    }

    public CapsXmlRetention(Integer days) {
        this.days = days;
    }

    @XmlAttribute
    private Integer days;

}
