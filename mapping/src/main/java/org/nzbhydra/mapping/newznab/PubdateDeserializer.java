package org.nzbhydra.mapping.newznab;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.deser.std.StdDeserializer;

import java.io.IOException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

public class PubdateDeserializer extends StdDeserializer<Instant> {
    private static final DateTimeFormatter DESERIALIZE_FORMAT = DateTimeFormatter.RFC_1123_DATE_TIME;
    private static final DateTimeFormatter SERIALIZE_FORMAT = DateTimeFormatter.ofPattern("EEE, dd MMM yyyy HH:mm:ss Z", Locale.US).withZone(ZoneId.of("UTC"));

    public PubdateDeserializer() {
        this(null);
    }

    public PubdateDeserializer(Class<?> vc) {
        super(vc);
    }


    @Override
    public Instant deserialize(JsonParser p, DeserializationContext ctxt) throws IOException, JsonProcessingException {
        return OffsetDateTime.parse(p.getText(), DESERIALIZE_FORMAT).toInstant();
    }
}
