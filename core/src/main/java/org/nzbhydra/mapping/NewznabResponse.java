package org.nzbhydra.mapping;

import lombok.Data;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlAttribute;
import javax.xml.bind.annotation.XmlRootElement;

@XmlRootElement(name = "newznab:response", namespace = "http://www.newznab.com/DTD/2010/feeds/attributes/")
@XmlAccessorType(XmlAccessType.FIELD)
@Data
public class NewznabResponse {

    public NewznabResponse() {
    }
    public NewznabResponse(Integer offset, Integer total) {
        this.offset = offset;
        this.total = total;
    }

    @XmlAttribute
    private Integer offset;

    @XmlAttribute
    private Integer total;


}
