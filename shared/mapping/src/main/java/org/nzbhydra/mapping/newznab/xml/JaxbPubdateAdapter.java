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

import javax.xml.bind.annotation.adapters.XmlAdapter;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

public class JaxbPubdateAdapter extends XmlAdapter<String, Instant> {
    //I don't remember why I need two different formats...
    private static final DateTimeFormatter FORMAT_INSTANT_TO_STRING = DateTimeFormatter.ofPattern("EEE, dd MMM yyyy HH:mm:ss Z", Locale.US).withZone(ZoneId.of("UTC"));
    private static final DateTimeFormatter FORMAT_STRING_TO_INSTANT = DateTimeFormatter.RFC_1123_DATE_TIME;


    @Override
    public String marshal(Instant date) {
        if (date == null) {
            return null;
        }
        return FORMAT_INSTANT_TO_STRING.format(date);
    }

    @Override
    public Instant unmarshal(String str) {
        if (str == null) {
            return null;
        }
        return OffsetDateTime.parse(str, FORMAT_STRING_TO_INSTANT).toInstant();
    }
}
