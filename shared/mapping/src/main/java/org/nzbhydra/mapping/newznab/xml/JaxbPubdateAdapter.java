

package org.nzbhydra.mapping.newznab.xml;


import jakarta.xml.bind.annotation.adapters.XmlAdapter;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

public class JaxbPubdateAdapter extends XmlAdapter<String, Instant> {
    //I don't remember why I need two different formats...
    private static final DateTimeFormatter FORMAT_GERMAN_TO_STRING = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss", Locale.GERMAN).withZone(ZoneId.of("GMT"));
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
        try {
            return OffsetDateTime.parse(str, FORMAT_STRING_TO_INSTANT).toInstant();
        } catch (Exception e) {
            return LocalDateTime.parse(str, FORMAT_GERMAN_TO_STRING).atZone(ZoneId.of("Europe/Berlin")).toInstant();
        }
    }
}
