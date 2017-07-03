package org.nzbhydra.mapping.newznab;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.ser.std.StdSerializer;

import java.io.IOException;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

public class PubdateSerializer extends StdSerializer<Instant> {
    private static final DateTimeFormatter SERIALIZE_FORMAT = DateTimeFormatter.ofPattern("EEE, dd MMM yyyy HH:mm:ss Z", Locale.US).withZone(ZoneId.of("UTC"));

    public PubdateSerializer() {
        this(null);
    }

    public PubdateSerializer(Class<Instant> t) {
        super(t);
    }


    @Override
    public void serialize(Instant value, JsonGenerator gen, SerializerProvider provider) throws IOException {
        gen.writeString(SERIALIZE_FORMAT.format(value));
    }
}
