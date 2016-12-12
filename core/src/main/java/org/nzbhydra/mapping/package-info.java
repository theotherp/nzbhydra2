@XmlSchema(
        elementFormDefault = XmlNsForm.QUALIFIED,
        xmlns = {
                @XmlNs(prefix = "newznab", namespaceURI = "http://www.newznab.com/DTD/2010/feeds/attributes/"),
                @XmlNs(prefix = "atom", namespaceURI = "http://www.w3.org/2005/Atom")
        }
)
package org.nzbhydra.mapping;

import javax.xml.bind.annotation.XmlNs;
import javax.xml.bind.annotation.XmlNsForm;
import javax.xml.bind.annotation.XmlSchema;