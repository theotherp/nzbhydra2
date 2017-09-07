package org.nzbhydra.mapping.newznab.caps;

import lombok.Data;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlAttribute;

@XmlAccessorType(XmlAccessType.FIELD)
@Data
public class CapsRetention {

    public CapsRetention() {
    }

    public CapsRetention(Integer days) {
        this.days = days;
    }

    @XmlAttribute
    private Integer days;

}
