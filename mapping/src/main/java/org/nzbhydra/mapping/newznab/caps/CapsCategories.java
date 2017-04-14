package org.nzbhydra.mapping.newznab.caps;

import lombok.AllArgsConstructor;
import lombok.Data;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlElement;
import javax.xml.bind.annotation.XmlRootElement;
import java.util.ArrayList;
import java.util.List;

@XmlRootElement(name = "categories")
@XmlAccessorType(XmlAccessType.FIELD)
@Data
@AllArgsConstructor
public class CapsCategories {

    @XmlElement(name = "category")
    private List<CapsCategory> categories = new ArrayList<>();
}
