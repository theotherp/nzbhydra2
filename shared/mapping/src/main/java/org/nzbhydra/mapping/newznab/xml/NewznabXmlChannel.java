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
import jakarta.xml.bind.annotation.XmlElement;
import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.ArrayList;
import java.util.List;

@XmlAccessorType(XmlAccessType.FIELD)
@Data
@ReflectionMarker
public class NewznabXmlChannel {

    private String title;
    private String description;
    private String link;
    private String language;
    private String webMaster;
    private String generator;

    @XmlElement(name = "response", namespace = "http://www.newznab.com/DTD/2010/feeds/attributes/")
    @JsonProperty("response")
    private NewznabXmlResponse newznabResponse;

    @XmlElement(name = "apilimits", namespace = "http://www.newznab.com/DTD/2010/feeds/attributes/")
    @JsonProperty("apilimits")
    private NewznabXmlApilimits apiLimits;

    @XmlElement(name = "item")
    private List<NewznabXmlItem> items = new ArrayList<>();

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        NewznabXmlChannel that = (NewznabXmlChannel) o;
        return Objects.equal(title, that.title) &&
                Objects.equal(link, that.link) &&
                Objects.equal(newznabResponse, that.newznabResponse) &&
                Objects.equal(items, that.items);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(title, link, newznabResponse, items);
    }
}
