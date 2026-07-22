

package org.nzbhydra.config;

import com.google.common.base.Strings;
import tools.jackson.core.JsonParser;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.deser.jdk.StringDeserializer;

public class EmptyStringToNullDeserializer extends StringDeserializer {

    @Override
    public String deserialize(JsonParser p, DeserializationContext ctxt) {
        return Strings.emptyToNull(super.deserialize(p, ctxt));
    }
}
