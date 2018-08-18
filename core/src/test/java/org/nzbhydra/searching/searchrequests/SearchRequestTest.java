package org.nzbhydra.searching.searchrequests;

import org.junit.Before;
import org.junit.Test;
import org.nzbhydra.searching.dtoseventsenums.SearchType;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;

import static junit.framework.TestCase.assertTrue;
import static org.junit.Assert.assertEquals;

public class SearchRequestTest {

    private SearchRequest testee;

    @Before
    public void setUp() {
        testee = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
    }

    @Test
    public void shouldFindAndRemoveExclusions() {
        testee.setQuery("one two --three --four");
        testee = testee.extractForbiddenWords();
        assertEquals(2, testee.getInternalData().getForbiddenWords().size());
        assertEquals("one two", testee.getQuery().get());
        assertTrue(testee.getInternalData().getForbiddenWords().contains("three"));
    }


}