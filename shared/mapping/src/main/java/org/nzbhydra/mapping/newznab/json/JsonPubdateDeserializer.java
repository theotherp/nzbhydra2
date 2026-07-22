

package org.nzbhydra.mapping.newznab.json;


import tools.jackson.core.JsonParser;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.ValueDeserializer;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;

public class JsonPubdateDeserializer extends ValueDeserializer<Instant> {
    private static final DateTimeFormatter FORMAT_STRING_TO_INSTANT = DateTimeFormatter.RFC_1123_DATE_TIME;


    @Override
    public Instant deserialize(JsonParser p, DeserializationContext ctxt) {
        return OffsetDateTime.parse(p.getValueAsString(), FORMAT_STRING_TO_INSTANT).toInstant();
    }
}
