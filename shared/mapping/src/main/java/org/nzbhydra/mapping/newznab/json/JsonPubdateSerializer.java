

package org.nzbhydra.mapping.newznab.json;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.SerializationContext;
import tools.jackson.databind.ValueSerializer;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

public class JsonPubdateSerializer extends ValueSerializer<Instant> {

    //I don't remember why I need two different formats...
    private static final DateTimeFormatter FORMAT_INSTANT_TO_STRING = DateTimeFormatter.ofPattern("EEE, dd MMM yyyy HH:mm:ss Z", Locale.US).withZone(ZoneId.of("UTC"));


    @Override
    public void serialize(Instant value, tools.jackson.core.JsonGenerator gen, SerializationContext ctxt) throws JacksonException {
        gen.writeString(FORMAT_INSTANT_TO_STRING.format(value));
    }
}
