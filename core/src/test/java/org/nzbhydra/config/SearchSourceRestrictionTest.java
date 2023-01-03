/*
 *  (C) Copyright 2017 TheOtherP (theotherp@posteo.net)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.nzbhydra.config;

import org.junit.jupiter.api.Test;
import org.nzbhydra.mediainfo.MediaIdType;
import org.nzbhydra.searching.dtoseventsenums.SearchType;
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

        SearchRequest apiSearchRequest = new SearchRequest(SearchRequest.SearchSource.API, SearchType.SEARCH, 0, 0);
        apiSearchRequest.setQuery("query");
        assertThat(SearchSourceRestriction.NONE.meets(apiSearchRequest)).isFalse();
        assertTrue(SearchSourceRestriction.BOTH.meets(apiSearchRequest));
        assertTrue(SearchSourceRestriction.API.meets(apiSearchRequest));
        assertThat(SearchSourceRestriction.INTERNAL.meets(apiSearchRequest)).isFalse();
        assertTrue(SearchSourceRestriction.ALL_BUT_RSS.meets(apiSearchRequest));
        assertThat(SearchSourceRestriction.ONLY_RSS.meets(apiSearchRequest)).isFalse();

        apiSearchRequest.setQuery(null);
        assertThat(SearchSourceRestriction.NONE.meets(apiSearchRequest)).isFalse();
        assertTrue(SearchSourceRestriction.BOTH.meets(apiSearchRequest));
        assertTrue(SearchSourceRestriction.API.meets(apiSearchRequest));
        assertThat(SearchSourceRestriction.INTERNAL.meets(apiSearchRequest)).isFalse();
        assertThat(SearchSourceRestriction.ALL_BUT_RSS.meets(apiSearchRequest)).isFalse();
        assertTrue(SearchSourceRestriction.ONLY_RSS.meets(apiSearchRequest));

        apiSearchRequest.setIdentifiers(identifiers);
        assertThat(SearchSourceRestriction.NONE.meets(apiSearchRequest)).isFalse();
        assertTrue(SearchSourceRestriction.BOTH.meets(apiSearchRequest));
        assertTrue(SearchSourceRestriction.API.meets(apiSearchRequest));
        assertThat(SearchSourceRestriction.INTERNAL.meets(apiSearchRequest)).isFalse();
        assertTrue(SearchSourceRestriction.ALL_BUT_RSS.meets(apiSearchRequest));
        assertThat(SearchSourceRestriction.ONLY_RSS.meets(apiSearchRequest)).isFalse();
    }

    @Test
    void shouldMeetCorrectlyForInternalSearches() {
        Map<MediaIdType, String> identifiers = new HashMap<>();
        identifiers.put(MediaIdType.IMDB, "imdbId");

        SearchRequest internalSearchRequest = new SearchRequest(SearchRequest.SearchSource.INTERNAL, SearchType.SEARCH, 0, 0);
        internalSearchRequest.setQuery("query");
        assertThat(SearchSourceRestriction.NONE.meets(internalSearchRequest)).isFalse();
        assertTrue(SearchSourceRestriction.BOTH.meets(internalSearchRequest));
        assertThat(SearchSourceRestriction.API.meets(internalSearchRequest)).isFalse();
        assertTrue(SearchSourceRestriction.INTERNAL.meets(internalSearchRequest));
        assertTrue(SearchSourceRestriction.ALL_BUT_RSS.meets(internalSearchRequest));
        assertThat(SearchSourceRestriction.ONLY_RSS.meets(internalSearchRequest)).isFalse();

        //No RSS / update / empty searches for internal

        internalSearchRequest.setIdentifiers(identifiers);
        assertThat(SearchSourceRestriction.NONE.meets(internalSearchRequest)).isFalse();
        assertTrue(SearchSourceRestriction.BOTH.meets(internalSearchRequest));
        assertThat(SearchSourceRestriction.API.meets(internalSearchRequest)).isFalse();
        assertTrue(SearchSourceRestriction.INTERNAL.meets(internalSearchRequest));
        assertTrue(SearchSourceRestriction.ALL_BUT_RSS.meets(internalSearchRequest));
        assertThat(SearchSourceRestriction.ONLY_RSS.meets(internalSearchRequest)).isFalse();
    }

}
