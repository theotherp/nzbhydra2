package org.nzbhydra.config.sensitive;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import tools.jackson.core.JsonGenerator;
import tools.jackson.databind.SerializationContext;
import tools.jackson.databind.ValueSerializer;

import java.util.Optional;

public class SensitiveDataHidingSerializer extends ValueSerializer<Object> {

    private static final Logger logger = LoggerFactory.getLogger(SensitiveDataHidingSerializer.class);

    @Override
    public void serialize(Object value, JsonGenerator gen, SerializationContext serializers) {
        String toWrite = "<REMOVED>";
        if (value instanceof Optional optional) {
            toWrite = optional.isPresent() ? "<REMOVED>" : "<NOTSET>";
        }
        logger.debug("Hiding sensitive data in config setting \"{}\"", gen.streamWriteContext().currentName());
        gen.writeString(toWrite);
    }
}
