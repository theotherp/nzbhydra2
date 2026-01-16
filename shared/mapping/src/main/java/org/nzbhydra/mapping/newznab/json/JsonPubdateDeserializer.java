

package org.nzbhydra.mapping.newznab.json;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;

import java.io.IOException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;

public class JsonPubdateDeserializer extends JsonDeserializer<Instant> {
        private static final DateTimeFormatter FORMAT_STRING_TO_INSTANT = DateTimeFormatter.RFC_1123_DATE_TIME;


    @Override
    public Instant deserialize(JsonParser p, DeserializationContext ctxt) throws IOException, JsonProcessingException {
        return OffsetDateTime.parse(p.getText(), FORMAT_STRING_TO_INSTANT).toInstant();
    }
}
