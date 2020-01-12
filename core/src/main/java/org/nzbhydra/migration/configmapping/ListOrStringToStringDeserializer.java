package org.nzbhydra.migration.configmapping;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.google.common.base.Strings;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class ListOrStringToStringDeserializer extends JsonDeserializer<List<String>> {
    @Override
    public List<String> deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        //Hacky but works
        Object value = p.readValueAs(Object.class);
        if (value instanceof List) {
            return (List<String>) value;
        }
        if (value instanceof String && Strings.isNullOrEmpty((String) value)) {
            return new ArrayList<>();
        }
        if (value instanceof String && !Strings.isNullOrEmpty((String) value)) {
            String string = (String) value;
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
