package org.nzbhydra.config.sensitive;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import tools.jackson.core.JsonGenerator;
import tools.jackson.databind.SerializationContext;
import tools.jackson.databind.ValueSerializer;

import java.util.Collection;
import java.util.Optional;

public class SensitiveDataHidingSerializer extends ValueSerializer<Object> {

    private static final Logger logger = LoggerFactory.getLogger(SensitiveDataHidingSerializer.class);

    @Override
    public void serialize(Object value, JsonGenerator gen, SerializationContext serializers) {
        if (value instanceof Collection<?> collection) {
            //Keep the number of entries visible and the value readable as the list it is
            logger.debug("Hiding sensitive data in config setting \"{}\"", gen.streamWriteContext().currentName());
            gen.writeStartArray();
            for (int i = 0; i < collection.size(); i++) {
                gen.writeString("<REMOVED>");
            }
            gen.writeEndArray();
            return;
        }
        String toWrite = "<REMOVED>";
        if (value instanceof Optional optional) {
            toWrite = optional.isPresent() ? "<REMOVED>" : "<NOTSET>";
        }
        logger.debug("Hiding sensitive data in config setting \"{}\"", gen.streamWriteContext().currentName());
        gen.writeString(toWrite);
    }
}
