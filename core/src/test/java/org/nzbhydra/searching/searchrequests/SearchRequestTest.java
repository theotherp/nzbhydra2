package org.nzbhydra.searching.searchrequests;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.config.searching.SearchType;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class SearchRequestTest {

    private SearchRequest testee;

    @BeforeEach
    public void setUp() {
        testee = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
    }

    @Test
    void shouldFindAndRemoveExclusions() {
        testee.setQuery("one two --three --four");
        testee = testee.extractQueryAndForbiddenWords();
        assertThat(testee.getInternalData().getForbiddenWords()).hasSize(2);
        assertThat(testee.getQuery().get()).isEqualTo("one two");
        assertTrue(testee.getInternalData().getForbiddenWords().contains("three"));
    }


}
