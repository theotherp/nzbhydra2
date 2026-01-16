

package org.nzbhydra.mapping;

import org.junit.jupiter.api.Test;
import org.nzbhydra.Jackson;
import org.nzbhydra.mapping.nzbindex.NzbIndexRoot;

public class NzbIndexApiMappingTest {

    @Test
    public void shouldDeserialize() throws Exception {
        Jackson.JSON_MAPPER.readValue(getClass().getResourceAsStream("/org/nzbhydra/mapping/nzbindexApi.json"), NzbIndexRoot.class);
    }

    @Test
    public void shouldDeserialize2() throws Exception {
        Jackson.JSON_MAPPER.readValue(getClass().getResourceAsStream("/org/nzbhydra/mapping/nzbindexApi2.json"), NzbIndexRoot.class);
    }
}
