/*
 *  (C) Copyright 2017 TheOtherP (theotherp@posteo.net)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.nzbhydra.mapping.newznab.xml;

import jakarta.xml.bind.JAXB;
import jakarta.xml.bind.annotation.XmlAccessType;
import jakarta.xml.bind.annotation.XmlAccessorType;
import jakarta.xml.bind.annotation.XmlRootElement;
import jakarta.xml.bind.annotation.XmlSeeAlso;
import jakarta.xml.bind.annotation.XmlTransient;
import org.nzbhydra.mapping.IndexerResponseTypeHolder;
import org.nzbhydra.mapping.newznab.NewznabResponse;
import org.nzbhydra.mapping.newznab.xml.caps.CapsXmlRoot;
import org.nzbhydra.mapping.newznab.xml.caps.jackett.JacketCapsXmlRoot;

import java.io.IOException;
import java.io.StringWriter;

@XmlRootElement
@XmlAccessorType(XmlAccessType.FIELD)
@XmlSeeAlso({NewznabXmlError.class, NewznabXmlRoot.class, CapsXmlRoot.class, JacketCapsXmlRoot.class})
public abstract class Xml extends NewznabResponse implements IndexerResponseTypeHolder {

    @XmlTransient
    private NewznabResponse.SearchType searchType;

    @Override
    public ResponseType getType() {
        return ResponseType.XML;
    }

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
