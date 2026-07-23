

package org.nzbhydra.config.category;

import com.google.common.base.Splitter;
import tools.jackson.core.JacksonException;
import tools.jackson.core.JsonParser;
import tools.jackson.core.JsonToken;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.ValueDeserializer;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

public class NewznabCategoriesDeserializer extends ValueDeserializer<List<List<Integer>>> {

    @Override
    public List<List<Integer>> deserialize(JsonParser p, DeserializationContext ctxt) throws JacksonException {
        List<List<Integer>> categories = new ArrayList<>();
        while (p.nextToken() != JsonToken.END_ARRAY) {
            categories.add(Splitter.on("&").splitToList(p.getString()).stream()
                    .map(Integer::valueOf)
                    .collect(Collectors.toList()));
        }
        return categories;
    }
}
