

package org.nzbhydra.config.category;

import com.google.common.base.Joiner;
import tools.jackson.core.JacksonException;
import tools.jackson.core.JsonGenerator;
import tools.jackson.databind.SerializationContext;
import tools.jackson.databind.ValueSerializer;

import java.util.List;

public class NewznabCategoriesSerializer extends ValueSerializer<List<List<Integer>>> {

    @Override
    public void serialize(List<List<Integer>> listOfLists, JsonGenerator gen, SerializationContext serializers) throws JacksonException {
        gen.writeStartArray();
        for (List<Integer> integerList : listOfLists) {
            gen.writeString(Joiner.on("&").join(integerList));
        }
        gen.writeEndArray();
    }
}
