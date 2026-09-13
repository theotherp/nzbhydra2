package org.nzbhydra.migration.configmapping;

import com.google.common.base.Strings;
import tools.jackson.core.JsonParser;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.ValueDeserializer;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class ListOrStringToStringDeserializer extends ValueDeserializer<List<String>> {
    @Override
    public List<String> deserialize(JsonParser p, DeserializationContext ctxt) {
        //Hacky but works
        Object value = p.readValueAs(Object.class);
        if (value instanceof List) {
            return (List<String>) value;
        }
        if (value instanceof String string && Strings.isNullOrEmpty(string)) {
            return new ArrayList<>();
        }
        if (value instanceof String string && !Strings.isNullOrEmpty((String) value)) {
            List<String> result = new ArrayList<>();
            if (!string.contains(",")) {
                result.add(string);
            } else {
                result = Arrays.asList(string.replace(", ", ",").split(","));
            }
            return result;
        }

        return new ArrayList<>();
    }
}
