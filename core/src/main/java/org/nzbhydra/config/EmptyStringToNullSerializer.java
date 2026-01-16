

package org.nzbhydra.config;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.ser.std.StdScalarSerializer;
import com.google.common.base.Strings;

import java.io.IOException;

public class EmptyStringToNullSerializer extends StdScalarSerializer<Object> {

    public EmptyStringToNullSerializer() {
        super(String.class, false);
    }

    @Override
    public void serialize(Object value, JsonGenerator gen, SerializerProvider provider) throws IOException {
        gen.writeString(Strings.emptyToNull((String) value));
    }
}
