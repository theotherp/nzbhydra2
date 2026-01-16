

package org.nzbhydra.mapping.newznab.xml.caps.jackett;

import jakarta.xml.bind.annotation.XmlAccessType;
import jakarta.xml.bind.annotation.XmlAccessorType;
import jakarta.xml.bind.annotation.XmlAttribute;
import jakarta.xml.bind.annotation.XmlElement;
import jakarta.xml.bind.annotation.XmlRootElement;
import lombok.Data;
import org.nzbhydra.mapping.newznab.xml.Xml;
import org.nzbhydra.mapping.newznab.xml.caps.CapsXmlRoot;
import org.nzbhydra.springnative.ReflectionMarker;


@XmlAccessorType(XmlAccessType.FIELD)
@XmlRootElement
@Data
@ReflectionMarker
public class JacketCapsXmlIndexer extends Xml {

    public JacketCapsXmlIndexer() {
    }

    @XmlAttribute(name = "id")
    private String id;

    private String title;

    @XmlElement
    private CapsXmlRoot caps;


}
