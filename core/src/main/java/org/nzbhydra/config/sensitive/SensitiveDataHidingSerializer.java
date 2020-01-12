package org.nzbhydra.config.sensitive;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.Optional;

public class SensitiveDataHidingSerializer extends JsonSerializer<Object> {

    private static final Logger logger = LoggerFactory.getLogger(SensitiveDataHidingSerializer.class);

    @Override
    public void serialize(Object value, JsonGenerator gen, SerializerProvider serializers) throws IOException {
        String toWrite = "<REMOVED>";
        if (value instanceof Optional) {
            Optional optional = (Optional) value;
            toWrite = optional.isPresent() ? "<REMOVED>" : "<NOTSET>";
        }
        logger.debug("Hiding sensitive data in config setting \"{}\"", gen.getOutputContext().getCurrentName());
        gen.writeString(toWrite);
    }
}
