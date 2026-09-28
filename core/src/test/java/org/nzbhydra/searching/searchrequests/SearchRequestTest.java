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

    @Test
    void shouldUseLoadAllQueryCapWhenLoadAllIsSet() {
        testee.setLoadAll(true);

        assertThat(testee.usesLoadAllQueryCap()).isTrue();
    }

    @Test
    void shouldUseLoadAllQueryCapForInternalContinuations() {
        testee.setSource(SearchSource.INTERNAL);
        testee.setOffset(100);
        testee.setLimit(1000);

        assertThat(testee.usesLoadAllQueryCap()).isTrue();
    }

    @Test
    void shouldNotUseLoadAllQueryCapForTheFirstInternalRequest() {
        testee.setSource(SearchSource.INTERNAL);
        testee.setOffset(0);

        assertThat(testee.usesLoadAllQueryCap()).isFalse();
    }

    @Test
    void shouldNotUseLoadAllQueryCapForApiSearchEvenWithALargeLimit() {
        testee.setSource(SearchSource.API);
        testee.setLimit(500);

        assertThat(testee.usesLoadAllQueryCap()).isFalse();
    }

}
