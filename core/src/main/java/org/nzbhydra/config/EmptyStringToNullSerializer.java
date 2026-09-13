

package org.nzbhydra.config;

import com.google.common.base.Strings;
import tools.jackson.core.JsonGenerator;
import tools.jackson.databind.SerializationContext;
import tools.jackson.databind.ser.std.StdScalarSerializer;

public class EmptyStringToNullSerializer extends StdScalarSerializer<Object> {

    public EmptyStringToNullSerializer() {
        super(String.class, false);
    }

    @Override
    public void serialize(Object value, JsonGenerator gen, SerializationContext provider) {
        gen.writeString(Strings.emptyToNull((String) value));
    }
}
