package org.nzbhydra.searching;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.nzbhydra.Jackson;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.config.searching.CustomQueryAndTitleMapping;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
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

    @Test
    void shouldApplyFirstOfMultipleMatchingWholeStringMappings() {
        CustomQueryAndTitleMapping first = new CustomQueryAndTitleMapping("search;query;some title;first replacement;true");
        CustomQueryAndTitleMapping second = new CustomQueryAndTitleMapping("search;query;some title;second replacement;true");
        SearchRequest searchRequest = searchRequestWithQuery("some title");

        SearchRequest mapped = testee.mapSearchRequest(searchRequest, List.of(first, second));

        assertThat(mapped.getQuery()).contains("first replacement");
    }

    @Test
    void shouldApplyPartialMappingsBeforeTheFirstAppliedWholeStringMapping() {
        CustomQueryAndTitleMapping partial = new CustomQueryAndTitleMapping("search;query;\\d;;false");
        CustomQueryAndTitleMapping first = new CustomQueryAndTitleMapping("search;query;{all:.*title};first:{all};true");
        CustomQueryAndTitleMapping second = new CustomQueryAndTitleMapping("search;query;.*;second;true");
        SearchRequest searchRequest = searchRequestWithQuery("1some title");

        SearchRequest mapped = testee.mapSearchRequest(searchRequest, List.of(partial, first, second));

        assertThat(mapped.getQuery()).contains("first:some title");
    }

    @Test
    void shouldNotApplyMappingsAfterAnAppliedWholeStringMapping() {
        CustomQueryAndTitleMapping wholeString = new CustomQueryAndTitleMapping("search;query;some title;replaced title;true");
        CustomQueryAndTitleMapping partial = new CustomQueryAndTitleMapping("search;query;title;NOPE;false");
        SearchRequest searchRequest = searchRequestWithQuery("some title");

        SearchRequest mapped = testee.mapSearchRequest(searchRequest, List.of(wholeString, partial));

        assertThat(mapped.getQuery()).contains("replaced title");
    }

    @Test
    void shouldSkipDisabledMappings() {
        CustomQueryAndTitleMapping disabled = new CustomQueryAndTitleMapping("search;query;some title;replaced title;true");
        disabled.setEnabled(false);
        SearchRequest searchRequest = searchRequestWithQuery("some title");

        SearchRequest mapped = testee.mapSearchRequest(searchRequest, List.of(disabled));

        assertThat(mapped.getQuery()).contains("some title");
    }

    @Test
    void shouldNotApplyTitleMappingToResultTitle() {
        CustomQueryAndTitleMapping titleMapping = new CustomQueryAndTitleMapping("search;title;Fairy;WRONG;false");
        CustomQueryAndTitleMapping resultTitleMapping = new CustomQueryAndTitleMapping("null;result_title;Tail;Tale;false");
        SearchResultItem item = new SearchResultItem();
        item.setTitle("Fairy Tail");

        SearchResultItem mapped = testee.mapSearchResult(item, List.of(titleMapping, resultTitleMapping));

        assertThat(mapped.getTitle()).isEqualTo("Fairy Tale");
    }

    @Test
    void shouldNotApplyResultTitleMappingToSearchRequest() {
        CustomQueryAndTitleMapping queryMapping = new CustomQueryAndTitleMapping("search;query;query;mapped query;false");
        CustomQueryAndTitleMapping resultTitleMapping = new CustomQueryAndTitleMapping("search;result_title;some title;WRONG;false");
        SearchRequest searchRequest = searchRequestWithQuery("some query");
        searchRequest.setTitle("some title");

        SearchRequest mapped = testee.mapSearchRequest(searchRequest, List.of(queryMapping, resultTitleMapping));

        assertThat(mapped.getTitle()).contains("some title");
        assertThat(mapped.getQuery()).contains("some mapped query");
    }

    @Test
    void shouldLoadMappingWithoutNameEnabledAndExamples() {
        String yamlOfAnOlderConfig = """
                searchType: SEARCH
                affectedValue: QUERY
                matchAll: true
                from: some title
                to: another title
                """;

        CustomQueryAndTitleMapping mapping = Jackson.YAML_MAPPER.readValue(yamlOfAnOlderConfig, CustomQueryAndTitleMapping.class);

        assertThat(mapping.getName()).isNull();
        assertThat(mapping.isEnabled()).isTrue();
        assertThat(mapping.getExamples()).isEmpty();
        assertThat(mapping.getFrom()).isEqualTo("some title");
    }

    private SearchRequest searchRequestWithQuery(String query) {
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setQuery(query);
        return searchRequest;
    }
}
