

package org.nzbhydra.mapping.newznab.xml.caps;

import jakarta.xml.bind.annotation.XmlAccessType;
import jakarta.xml.bind.annotation.XmlAccessorType;
import jakarta.xml.bind.annotation.XmlElement;
import jakarta.xml.bind.annotation.XmlRootElement;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.ArrayList;
import java.util.List;

@XmlRootElement(name = "categories")
@XmlAccessorType(XmlAccessType.FIELD)
@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
public class CapsXmlCategories {

    @XmlElement(name = "category")
    private List<CapsXmlCategory> categories = new ArrayList<>();
}
