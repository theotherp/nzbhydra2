package org.nzbhydra.mapping.rss;

import javax.xml.bind.annotation.adapters.XmlAdapter;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

public class JaxbPubdateAdapter extends XmlAdapter<String, Instant> {
    private static final DateTimeFormatter FORMAT2 = DateTimeFormatter.RFC_1123_DATE_TIME;
    private static final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("EEE, dd MMM yyyy HH:mm:ss Z", Locale.US).withZone(ZoneId.of("UTC"));


    @Override
    public String marshal(Instant date) {
        return formatter.format(date);
    }

    @Override
    public Instant unmarshal(String str) {

        return OffsetDateTime.parse(str, FORMAT2).toInstant();
    }
}
