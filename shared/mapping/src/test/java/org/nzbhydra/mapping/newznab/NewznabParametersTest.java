package org.nzbhydra.mapping.newznab;


import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

public class NewznabParametersTest {


    @Test
    public void testHashCode() throws Exception {
        NewznabParameters testee1 = new NewznabParameters();
        testee1.setQ("q");

        NewznabParameters testee2 = new NewznabParameters();
        testee2.setQ("q");

        assertThat(testee2.cacheKey(NewznabResponse.SearchType.TORZNAB)).isEqualTo(testee1.cacheKey(NewznabResponse.SearchType.TORZNAB));
        assertNotEquals(testee1.cacheKey(NewznabResponse.SearchType.TORZNAB), testee2.cacheKey(NewznabResponse.SearchType.NEWZNAB));

        testee2.setQ("anotherQ");
        assertNotEquals(testee1.cacheKey(NewznabResponse.SearchType.TORZNAB), testee2.cacheKey(NewznabResponse.SearchType.TORZNAB));
    }


}
