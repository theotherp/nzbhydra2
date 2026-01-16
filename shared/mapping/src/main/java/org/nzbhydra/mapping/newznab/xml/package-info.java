

@XmlSchema(
    elementFormDefault = XmlNsForm.QUALIFIED, xmlns = {
    @XmlNs(prefix = "newznab", namespaceURI = "http://www.newznab.com/DTD/2010/feeds/attributes/"),
    @XmlNs(prefix = "torznab", namespaceURI = "http://torznab.com/schemas/2015/feed"),
    @XmlNs(prefix = "atom", namespaceURI = "http://www.w3.org/2005/Atom")
}
)
package org.nzbhydra.mapping.newznab.xml;


import jakarta.xml.bind.annotation.XmlNs;
import jakarta.xml.bind.annotation.XmlNsForm;
import jakarta.xml.bind.annotation.XmlSchema;
