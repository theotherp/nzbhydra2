

package org.nzbhydra.mapping.json;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.base.Charsets;
import com.google.common.io.Resources;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.nzbhydra.mapping.newznab.json.NewznabJsonRoot;
import org.springframework.test.context.junit.jupiter.SpringExtension;

@ExtendWith(SpringExtension.class)
public class JsonCustomQueryAndTitleMappingTest {


    @Test
    void shouldSerializeToJson() throws Exception {
        ObjectMapper objectMapper = new ObjectMapper();
        String json = Resources.toString(Resources.getResource(JsonCustomQueryAndTitleMappingTest.class, ("nzbsorg_3items.json").toLowerCase()), Charsets.UTF_8);
        NewznabJsonRoot root = objectMapper.readValue(json, NewznabJsonRoot.class);
        System.out.println(json);
    }


}
