

package org.nzbhydra.mapping.newznab.xml;

import jakarta.xml.bind.JAXB;
import jakarta.xml.bind.annotation.XmlAccessType;
import jakarta.xml.bind.annotation.XmlAccessorType;
import jakarta.xml.bind.annotation.XmlRootElement;
import jakarta.xml.bind.annotation.XmlSeeAlso;
import jakarta.xml.bind.annotation.XmlTransient;
import org.nzbhydra.mapping.newznab.NewznabResponse;
import org.nzbhydra.mapping.newznab.xml.caps.CapsXmlRoot;
import org.nzbhydra.mapping.newznab.xml.caps.jackett.JacketCapsXmlRoot;

import java.io.IOException;
import java.io.StringWriter;

@XmlRootElement
@XmlAccessorType(XmlAccessType.FIELD)
@XmlSeeAlso({NewznabXmlError.class, NewznabXmlRoot.class, CapsXmlRoot.class, JacketCapsXmlRoot.class})
public abstract class Xml extends NewznabResponse {

    @XmlTransient
    private NewznabResponse.SearchType searchType;


    @Override
    public String getContentHeader() {
        return "application/xml";
    }

    @Override
    public NewznabResponse.SearchType getSearchType() {
        return searchType;
    }

    @Override
    public void setSearchType(NewznabResponse.SearchType searchType) {
        this.searchType = searchType;
    }

    public String toXmlString() {
        try (StringWriter writer = new StringWriter()) {
            JAXB.marshal(this, writer);
            return writer.toString();
        } catch (IOException e) {
            return null;
        }
    }


}
