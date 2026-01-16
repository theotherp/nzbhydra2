

package org.nzbhydra.mapping.newznab.xml;

import jakarta.xml.bind.annotation.XmlAccessType;
import jakarta.xml.bind.annotation.XmlAccessorType;
import jakarta.xml.bind.annotation.XmlAttribute;
import jakarta.xml.bind.annotation.XmlRootElement;
import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;


@XmlRootElement(name = "response", namespace = "http://www.newznab.com/DTD/2010/feeds/attributes/")
@XmlAccessorType(XmlAccessType.FIELD)
@Data
@ReflectionMarker
public class NewznabXmlResponse {

    public NewznabXmlResponse() {
    }

    public NewznabXmlResponse(Integer offset, Integer total) {
        this.offset = offset == null ? 0 : offset;
        this.total = total;
    }

    @XmlAttribute
    private Integer offset;

    @XmlAttribute
    private Integer total;


}
