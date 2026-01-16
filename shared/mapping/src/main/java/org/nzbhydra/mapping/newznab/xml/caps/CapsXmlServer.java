

package org.nzbhydra.mapping.newznab.xml.caps;

import jakarta.xml.bind.annotation.XmlAccessType;
import jakarta.xml.bind.annotation.XmlAccessorType;
import jakarta.xml.bind.annotation.XmlAttribute;
import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;


@XmlAccessorType(XmlAccessType.FIELD)
@Data
@ReflectionMarker
public class CapsXmlServer {

    public CapsXmlServer() {
    }

    @XmlAttribute
    private String version;

    @XmlAttribute
    private String title;

    @XmlAttribute
    private String strapline;

    @XmlAttribute
    private String email;

    @XmlAttribute
    private String url;

    @XmlAttribute
    private String image; //LATER favicon


}
