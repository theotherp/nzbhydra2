

package org.nzbhydra.mapping.newznab.xml.caps.jackett;

import jakarta.xml.bind.annotation.XmlAccessType;
import jakarta.xml.bind.annotation.XmlAccessorType;
import jakarta.xml.bind.annotation.XmlElement;
import jakarta.xml.bind.annotation.XmlRootElement;
import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.List;

@XmlAccessorType(XmlAccessType.FIELD)
@XmlRootElement(name = "indexers")
@Data
@ReflectionMarker
public class JacketCapsXmlRoot {

    public JacketCapsXmlRoot() {
    }

    @XmlElement(name = "indexer")
    private List<JacketCapsXmlIndexer> indexers;

}
