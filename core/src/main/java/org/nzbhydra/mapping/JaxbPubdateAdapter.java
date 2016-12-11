package org.nzbhydra.mapping;

import javax.xml.bind.annotation.adapters.XmlAdapter;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;

public class JaxbPubdateAdapter extends XmlAdapter<String, Instant> {
    private static final DateTimeFormatter FORMAT2 = DateTimeFormatter.RFC_1123_DATE_TIME;

    @Override
    public String marshal(Instant date) throws Exception {
        return date.toString();
    }

    @Override
    public Instant unmarshal(String str) throws Exception {
        return OffsetDateTime.parse(str, FORMAT2).toInstant();
    }
}
