package org.nzbhydra.mapping.newznab.caps;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlAttribute;
import javax.xml.bind.annotation.XmlElement;
import javax.xml.bind.annotation.XmlRootElement;
import java.util.List;

@XmlRootElement(name = "category")
@XmlAccessorType(XmlAccessType.FIELD)
@Data
@AllArgsConstructor
@NoArgsConstructor
public class CapsCategory {

    public CapsCategory(int id, String name) {
        this.id = id;
        this.name = name;
    }

    @XmlAttribute
    private int id;
    @XmlAttribute
    private String name;
    @XmlElement(name = "subcat")
    private List<CapsCategory> subCategories;


}
