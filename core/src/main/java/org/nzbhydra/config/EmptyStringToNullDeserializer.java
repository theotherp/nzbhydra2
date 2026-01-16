

package org.nzbhydra.config;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.deser.std.StringDeserializer;
import com.google.common.base.Strings;

import java.io.IOException;

public class EmptyStringToNullDeserializer extends StringDeserializer {

    @Override
    public String deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        return Strings.emptyToNull(super.deserialize(p, ctxt));
    }
}
