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
import javax.xml.bind.annotation.adapters.XmlJavaTypeAdapter;
import java.time.Instant;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;

@XmlRootElement(name = "apilimits", namespace = "http://www.newznab.com/DTD/2010/feeds/attributes/")
@XmlAccessorType(XmlAccessType.FIELD)
@Data
public class NewznabXmlApilimits {

    @XmlAttribute(name = "apicurrent")
    private Integer apicurrent;
    @XmlAttribute(name = "apiCurrent")
    private Integer apiCurrent;

    @XmlAttribute(name = "apimax")
    private Integer apimax;
    @XmlAttribute(name = "apiMax")
    private Integer apiMax;

    @XmlAttribute(name = "grabcurrent")
    private Integer grabcurrent;
    @XmlAttribute(name = "grabCurrent")
    private Integer grabCurrent;

    @XmlAttribute(name = "grabmax")
    private Integer grabmax;
    @XmlAttribute(name = "grabMax")
    private Integer grabMax;


    @XmlAttribute(name = "apioldesttime")
    @XmlJavaTypeAdapter(JaxbPubdateAdapter.class)
    private Instant apiOldestTime;
    @XmlAttribute(name = "graboldesttime")
    @XmlJavaTypeAdapter(JaxbPubdateAdapter.class)
    private Instant grabOldestTime;


    public NewznabXmlApilimits() {
    }

    public NewznabXmlApilimits(Integer apiCurrent, Integer apiMax, Integer grabCurrent, Integer grabMax) {
        this.apiCurrent = apiCurrent;
        this.apiMax = apiMax;
        this.grabCurrent = grabCurrent;
        this.grabMax = grabMax;
    }

    public NewznabXmlApilimits(Integer apiCurrent, Integer apiMax, Integer grabCurrent, Integer grabMax, Instant apiOldestTime, Instant grabOldestTime) {
        this.apiCurrent = apiCurrent;
        this.apiMax = apiMax;
        this.grabCurrent = grabCurrent;
        this.grabMax = grabMax;
        this.apiOldestTime = apiOldestTime;
        this.grabOldestTime = grabOldestTime;
    }

    public Integer getApiCurrent() {
        return apiCurrent != null ? apiCurrent : apicurrent;
    }

    public Integer getApiMax() {
        return apiMax != null ? apiMax : apimax;
    }

    public Integer getGrabCurrent() {
        return grabCurrent != null ? grabCurrent : grabcurrent;
    }

    public Integer getGrabMax() {
        return grabMax != null ? grabMax : grabmax;
    }

    public Instant getApiOldestTime() {
        //The format of the dates is currently "Mon, 20 Apr 20 03:20:41 +0200" (with only two digits for the year)
        // which is a different format than the pubdate so it's parsed as year 20 instead of 2020
        if (apiOldestTime != null && apiOldestTime.getEpochSecond() < 0) {
            apiOldestTime = apiOldestTime.atZone(ZoneId.of("UTC")).plus(2000, ChronoUnit.YEARS).toInstant();
        }
        return apiOldestTime;
    }

    public Instant getGrabOldestTime() {
        //see above
        if (grabOldestTime != null && grabOldestTime.getEpochSecond() < 0) {
            grabOldestTime = grabOldestTime.atZone(ZoneId.of("UTC")).plus(2000, ChronoUnit.YEARS).toInstant();
        }
        return grabOldestTime;
    }
}
