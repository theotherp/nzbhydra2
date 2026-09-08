package org.nzbhydra.searching;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.config.searching.CustomQueryAndTitleMapping;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.searching.searchrequests.SearchRequest;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CustomQueryAndTitleMappingHandlerTest {

    private CustomQueryAndTitleMappingHandler testee;

    @BeforeEach
    void setUp() {
        testee = new CustomQueryAndTitleMappingHandler(new BaseConfig());
    }

    @Test
    void shouldRemovePartOfQueryWithoutModifyingTheMapping() {
        CustomQueryAndTitleMapping mapping = new CustomQueryAndTitleMapping("search;query; REMOVEME;<remove>;false");
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setQuery("some title REMOVEME");

        SearchRequest mapped = testee.mapSearchRequest(searchRequest, List.of(mapping));

        assertThat(mapped.getQuery()).contains("some title");
        assertThat(mapping.getTo()).isEqualTo("<remove>");
    }

    @Test
    void shouldStillRemovePartOfQueryWhenMappingIsUsedRepeatedly() {
        CustomQueryAndTitleMapping mapping = new CustomQueryAndTitleMapping("search;query; REMOVEME;<remove>;false");
        for (int i = 0; i < 3; i++) {
            SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
            searchRequest.setQuery("some title REMOVEME");

            SearchRequest mapped = testee.mapSearchRequest(searchRequest, List.of(mapping));

            assertThat(mapped.getQuery()).contains("some title");
        }
        assertThat(mapping.getTo()).isEqualTo("<remove>");
    }
}
