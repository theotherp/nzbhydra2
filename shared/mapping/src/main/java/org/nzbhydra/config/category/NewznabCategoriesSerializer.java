

package org.nzbhydra.config.category;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.google.common.base.Joiner;

import java.io.IOException;
import java.util.List;

public class NewznabCategoriesSerializer extends JsonSerializer<List<List<Integer>>> {

    @Override
    public void serialize(List<List<Integer>> listOfLists, JsonGenerator gen, SerializerProvider serializers) throws IOException {
        gen.writeStartArray();
        for (List<Integer> integerList : listOfLists) {
            gen.writeString(Joiner.on("&").join(integerList));
        }
        gen.writeEndArray();
    }
}
