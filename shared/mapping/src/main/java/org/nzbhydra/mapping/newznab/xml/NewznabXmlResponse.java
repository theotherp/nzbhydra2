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

import lombok.Data;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlAttribute;
import javax.xml.bind.annotation.XmlRootElement;

@XmlRootElement(name = "response", namespace = "http://www.newznab.com/DTD/2010/feeds/attributes/")
@XmlAccessorType(XmlAccessType.FIELD)
@Data
public class NewznabXmlResponse {

    public NewznabXmlResponse() {
    }

    public NewznabXmlResponse(Integer offset, Integer total) {
        this.offset = offset == null ? 0 : offset;
        this.total = total;
    }

    @XmlAttribute
    private Integer offset;

    @XmlAttribute
    private Integer total;


}
