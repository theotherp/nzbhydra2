

package org.nzbhydra.config.category;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.google.common.base.Splitter;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

public class NewznabCategoriesDeserializer extends JsonDeserializer<List<List<Integer>>> {

    @Override
    public List<List<Integer>> deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        List<String> list = p.readValueAs(new TypeReference<List<String>>() {
        });

        return list.stream().map(x -> Splitter.on("&").splitToList(x).stream().map(Integer::valueOf).collect(Collectors.toList())).collect(Collectors.toList());
    }
}
