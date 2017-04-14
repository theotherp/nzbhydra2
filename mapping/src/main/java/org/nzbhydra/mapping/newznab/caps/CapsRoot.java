package org.nzbhydra.mapping.newznab.caps;

import lombok.Data;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlElement;
import javax.xml.bind.annotation.XmlRootElement;
import java.util.ArrayList;

@XmlAccessorType(XmlAccessType.FIELD)
@XmlRootElement(name = "caps")
@Data
public class CapsRoot {

    @XmlElement
    private CapsLimits limits;

    @XmlElement
    private CapsRetention retention;

    @XmlElement
    private CapsSearching searching;

    @XmlElement(name = "categories")
    private CapsCategories categories = new CapsCategories(new ArrayList<>());


}
