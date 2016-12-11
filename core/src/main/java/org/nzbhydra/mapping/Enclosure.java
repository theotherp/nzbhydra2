package org.nzbhydra.mapping;

import javax.xml.bind.annotation.*;

@XmlRootElement(name = "guid")
@XmlAccessorType(XmlAccessType.FIELD)
public class Enclosure {

    @XmlAttribute
    private String url;

    @XmlAttribute
    private Integer length;




}
