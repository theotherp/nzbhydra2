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

import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.common.base.Objects;
import jakarta.xml.bind.annotation.XmlAccessType;
import jakarta.xml.bind.annotation.XmlAccessorType;
import jakarta.xml.bind.annotation.XmlAttribute;
import jakarta.xml.bind.annotation.XmlElement;
import jakarta.xml.bind.annotation.XmlRootElement;
import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;


@XmlRootElement(name = "rss")
@XmlAccessorType(XmlAccessType.FIELD)
@Data
@ReflectionMarker
public class NewznabXmlRoot extends Xml {

    @XmlAttribute
    private String version = "2.0";

    @XmlElement(name = "channel")
    @JsonProperty("channel")
    private NewznabXmlChannel rssChannel = new NewznabXmlChannel();

    @XmlElement(name = "error")
    @JsonProperty("error")
    private NewznabXmlError error;

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        NewznabXmlRoot that = (NewznabXmlRoot) o;
        return Objects.equal(rssChannel, that.rssChannel) &&
                Objects.equal(error, that.error);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(rssChannel, error);
    }
}
