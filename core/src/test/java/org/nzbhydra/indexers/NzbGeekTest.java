package org.nzbhydra.indexers;

import org.junit.Test;
import org.mockito.InjectMocks;

import static org.hamcrest.CoreMatchers.is;
import static org.junit.Assert.assertThat;

public class NzbGeekTest {

    @InjectMocks
    private NzbGeek testee = new NzbGeek(null,null,null,null,null,null,null,null,null,null,null,null,null,null);


    @Test
    public void shouldNotUseMoreThan6WordsForNzbGeek() throws Exception {
        String query = "1 2 3 4 5 6 7 8 9";
        assertThat(testee.cleanupQuery(query), is("1 2 3 4 5 6"));
    }


}
