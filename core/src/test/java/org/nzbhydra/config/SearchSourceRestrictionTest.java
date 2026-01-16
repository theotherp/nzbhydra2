

package org.nzbhydra.config;

import org.junit.jupiter.api.Test;
import org.nzbhydra.config.mediainfo.MediaIdType;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.searching.searchrequests.SearchRequest;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class SearchSourceRestrictionTest {

    @Test
    void shouldMeetCorrectlyForApiSearches() {
        Map<MediaIdType, String> identifiers = new HashMap<>();
        identifiers.put(MediaIdType.IMDB, "imdbId");

        SearchRequest apiSearchRequest = new SearchRequest(SearchSource.API, SearchType.SEARCH, 0, 0);
        apiSearchRequest.setQuery("query");
        assertThat(apiSearchRequest.meets(SearchSourceRestriction.NONE)).isFalse();
        assertTrue(apiSearchRequest.meets(SearchSourceRestriction.BOTH));
        assertTrue(apiSearchRequest.meets(SearchSourceRestriction.API));
        assertThat(apiSearchRequest.meets(SearchSourceRestriction.INTERNAL)).isFalse();
        assertTrue(apiSearchRequest.meets(SearchSourceRestriction.ALL_BUT_RSS));
        assertThat(apiSearchRequest.meets(SearchSourceRestriction.ONLY_RSS)).isFalse();

        apiSearchRequest.setQuery(null);
        assertThat(apiSearchRequest.meets(SearchSourceRestriction.NONE)).isFalse();
        assertTrue(apiSearchRequest.meets(SearchSourceRestriction.BOTH));
        assertTrue(apiSearchRequest.meets(SearchSourceRestriction.API));
        assertThat(apiSearchRequest.meets(SearchSourceRestriction.INTERNAL)).isFalse();
        assertThat(apiSearchRequest.meets(SearchSourceRestriction.ALL_BUT_RSS)).isFalse();
        assertTrue(apiSearchRequest.meets(SearchSourceRestriction.ONLY_RSS));

        apiSearchRequest.setIdentifiers(identifiers);
        assertThat(apiSearchRequest.meets(SearchSourceRestriction.NONE)).isFalse();
        assertTrue(apiSearchRequest.meets(SearchSourceRestriction.BOTH));
        assertTrue(apiSearchRequest.meets(SearchSourceRestriction.API));
        assertThat(apiSearchRequest.meets(SearchSourceRestriction.INTERNAL)).isFalse();
        assertTrue(apiSearchRequest.meets(SearchSourceRestriction.ALL_BUT_RSS));
        assertThat(apiSearchRequest.meets(SearchSourceRestriction.ONLY_RSS)).isFalse();
    }

    @Test
    void shouldMeetCorrectlyForInternalSearches() {
        Map<MediaIdType, String> identifiers = new HashMap<>();
        identifiers.put(MediaIdType.IMDB, "imdbId");

        SearchRequest internalSearchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 0);
        internalSearchRequest.setQuery("query");
        assertThat(internalSearchRequest.meets(SearchSourceRestriction.NONE)).isFalse();
        assertTrue(internalSearchRequest.meets(SearchSourceRestriction.BOTH));
        assertThat(internalSearchRequest.meets(SearchSourceRestriction.API)).isFalse();
        assertTrue(internalSearchRequest.meets(SearchSourceRestriction.INTERNAL));
        assertTrue(internalSearchRequest.meets(SearchSourceRestriction.ALL_BUT_RSS));
        assertThat(internalSearchRequest.meets(SearchSourceRestriction.ONLY_RSS)).isFalse();

        //No RSS / update / empty searches for internal

        internalSearchRequest.setIdentifiers(identifiers);
        assertThat(internalSearchRequest.meets(SearchSourceRestriction.NONE)).isFalse();
        assertTrue(internalSearchRequest.meets(SearchSourceRestriction.BOTH));
        assertThat(internalSearchRequest.meets(SearchSourceRestriction.API)).isFalse();
        assertTrue(internalSearchRequest.meets(SearchSourceRestriction.INTERNAL));
        assertTrue(internalSearchRequest.meets(SearchSourceRestriction.ALL_BUT_RSS));
        assertThat(internalSearchRequest.meets(SearchSourceRestriction.ONLY_RSS)).isFalse();
    }

}
