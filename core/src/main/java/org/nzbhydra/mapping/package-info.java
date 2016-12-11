@XmlSchema(
        elementFormDefault = XmlNsForm.QUALIFIED,
        xmlns = {
                @XmlNs(prefix = "newznab", namespaceURI = "http://www.newznab.com/DTD/2010/feeds/attributes/"),
                @XmlNs(prefix = "content", namespaceURI = "http://purl.org/rss/1.0/modules/content/")
        }
)
package org.nzbhydra.mapping;

import javax.xml.bind.annotation.XmlNs;
import javax.xml.bind.annotation.XmlNsForm;
import javax.xml.bind.annotation.XmlSchema;