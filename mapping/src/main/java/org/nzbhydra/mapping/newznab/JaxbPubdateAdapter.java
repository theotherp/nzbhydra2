package org.nzbhydra.mapping.newznab;

import javax.xml.bind.annotation.adapters.XmlAdapter;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

public class JaxbPubdateAdapter extends XmlAdapter<String, Instant> {
    private static final DateTimeFormatter DESERIALIZE_FORMAT = DateTimeFormatter.RFC_1123_DATE_TIME;
    private static final DateTimeFormatter SERIALIZE_FORMAT = DateTimeFormatter.ofPattern("EEE, dd MMM yyyy HH:mm:ss Z", Locale.US).withZone(ZoneId.of("UTC"));


    @Override
    public String marshal(Instant date) {
        return SERIALIZE_FORMAT.format(date);
    }

    @Override
    public Instant unmarshal(String str) {

        return OffsetDateTime.parse(str, DESERIALIZE_FORMAT).toInstant();
    }
}
