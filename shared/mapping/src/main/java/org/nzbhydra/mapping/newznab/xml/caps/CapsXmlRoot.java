

package org.nzbhydra.mapping.newznab.xml.caps;

import jakarta.xml.bind.annotation.XmlAccessType;
import jakarta.xml.bind.annotation.XmlAccessorType;
import jakarta.xml.bind.annotation.XmlElement;
import jakarta.xml.bind.annotation.XmlRootElement;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.nzbhydra.mapping.newznab.xml.Xml;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.ArrayList;

@XmlAccessorType(XmlAccessType.FIELD)
@XmlRootElement(name = "caps")
@Data
@EqualsAndHashCode(callSuper = true)
@ReflectionMarker
public class CapsXmlRoot extends Xml {

    @XmlElement
    private CapsXmlServer server;

    @XmlElement
    private CapsXmlLimits limits;

    @XmlElement
    private CapsXmlRetention retention;

    @XmlElement
    private CapsXmlSearching searching;

    @XmlElement(name = "categories")
    private CapsXmlCategories categories = new CapsXmlCategories(new ArrayList<>());


}
