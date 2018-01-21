package org.nzbhydra.mapping.newznab.caps;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.xml.bind.annotation.*;
import java.util.ArrayList;
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
    private List<CapsCategory> subCategories = new ArrayList<>();


}
