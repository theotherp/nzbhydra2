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

import com.google.common.base.Objects;
import jakarta.xml.bind.annotation.XmlAccessType;
import jakarta.xml.bind.annotation.XmlAccessorType;
import jakarta.xml.bind.annotation.XmlElement;
import jakarta.xml.bind.annotation.XmlRootElement;
import jakarta.xml.bind.annotation.XmlType;
import jakarta.xml.bind.annotation.adapters.XmlJavaTypeAdapter;
import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@XmlAccessorType(XmlAccessType.FIELD)
@XmlRootElement(name = "item")
@Data
@ReflectionMarker
//Link must be before enclosure for HeadPhones to work
@XmlType(propOrder = {"title", "link", "enclosures", "pubDate", "rssGuid", "description", "comments", "category", "grabs", "size", "newznabAttributes", "torznabAttributes"})
public class NewznabXmlItem {

    @XmlElement(name = "title")
    private String title;

    @XmlElement(name = "link")
    private String link;

    @XmlElement(name = "enclosure")
    private List<NewznabXmlEnclosure> enclosures;

    @XmlElement(name = "pubDate")
    @XmlJavaTypeAdapter(JaxbPubdateAdapter.class)
    private Instant pubDate;

    @XmlElement(name = "guid")
    private NewznabXmlGuid rssGuid;

    @XmlElement(name = "description")
    private String description;

    @XmlElement(name = "comments")
    private String comments;

    @XmlElement(name = "category")
    private String category;

    @XmlElement(name = "grabs") //Only set by torznab
    private Integer grabs;

    @XmlElement(name = "size") //Only set by torznab
    private Long size;

    @XmlElement(name = "attr", namespace = "http://www.newznab.com/DTD/2010/feeds/attributes/")
    private List<NewznabAttribute> newznabAttributes = new ArrayList<>();

    @XmlElement(name = "attr", namespace = "http://torznab.com/schemas/2015/feed")
    private List<NewznabAttribute> torznabAttributes = new ArrayList<>();

    public NewznabXmlEnclosure getEnclosure() {
        if (enclosures == null || enclosures.isEmpty()) {
            return null;
        }
        return enclosures.get(0);
    }

    public void setEnclosure(NewznabXmlEnclosure enclosure) {
        this.enclosures = new ArrayList<>(Collections.singletonList(enclosure));
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        NewznabXmlItem that = (NewznabXmlItem) o;
        return Objects.equal(title, that.title) &&
                Objects.equal(link, that.link);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(title, link);
    }
}
