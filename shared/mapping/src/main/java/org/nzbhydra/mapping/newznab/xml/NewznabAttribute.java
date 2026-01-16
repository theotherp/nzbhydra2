

package org.nzbhydra.mapping.newznab.xml;

import jakarta.xml.bind.annotation.XmlAccessType;
import jakarta.xml.bind.annotation.XmlAccessorType;
import jakarta.xml.bind.annotation.XmlAttribute;
import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;


//@XmlRootElement(name = "attr", namespace = "http://www.newznab.com/DTD/2010/feeds/attributes/")
@XmlAccessorType(XmlAccessType.FIELD)
@Data
@ReflectionMarker
public class NewznabAttribute {

    public NewznabAttribute() {
    }

    public NewznabAttribute(String name, String value) {
        this.name = name;
        this.value = value;
    }

    @XmlAttribute
    private String name;

    @XmlAttribute
    private String value;


}
