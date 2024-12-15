package org.nzbhydra.indexers;

import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;

import static org.assertj.core.api.Assertions.assertThat;

public class NzbGeekTest {

    @InjectMocks
    private NzbGeek testee = new NzbGeek(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);


    @Test
    void shouldNotUseMoreThan6WordsForNzbGeek() throws Exception {
        String query = "1 2 3 4 5 6 7 8 9";
        assertThat(testee.cleanupQuery(query)).isEqualTo("1 2 3 4 5 6");
    }


}
