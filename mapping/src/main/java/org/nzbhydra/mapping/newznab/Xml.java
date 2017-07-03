package org.nzbhydra.mapping.newznab;

import javax.xml.bind.JAXB;
import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlSeeAlso;
import java.io.IOException;
import java.io.StringWriter;

@XmlRootElement
@XmlAccessorType(XmlAccessType.FIELD)
@XmlSeeAlso({RssError.class, RssRoot.class})
public class Xml {

    public String toXmlString() {
        try (StringWriter writer = new StringWriter()) {
            JAXB.marshal(this, writer);
            return writer.toString();
        } catch (IOException e) {
            return null;
        }
    }

}
