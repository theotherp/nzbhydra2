package org.nzbhydra.mapping.newznab.caps;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlElementWrapper;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlRootElement;
import java.util.ArrayList;
import java.util.List;

@XmlRootElement(name = "category")
@XmlAccessorType(XmlAccessType.FIELD)
@Data
@AllArgsConstructor
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class CapsCategory {

    public CapsCategory(int id, String name) {
        this.id = id;
        this.name = name;
    }

    @JacksonXmlProperty(isAttribute = true)
    private int id;
    @JacksonXmlProperty(isAttribute = true)
    private String name;
    @JacksonXmlProperty(localName = "subcat")
    @JacksonXmlElementWrapper(useWrapping = false)
    private List<CapsCategory> subCategories = new ArrayList<>();


}
