

package org.nzbhydra.searching;

import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.searching.AffectedValue;
import org.nzbhydra.config.searching.CustomQueryAndTitleMapping;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.searchrequests.SearchRequest;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertTrue;


public class CustomQueryAndTitleCustomQueryAndTitleMappingHandlerTest {


    @InjectMocks
    private CustomQueryAndTitleMappingHandler testee = new CustomQueryAndTitleMappingHandler(new BaseConfig());


    @Test
    public void shouldMapQueryForShowAddingSeasonAndEpisode() {
        final SearchRequest searchRequest = new SearchRequest();
        searchRequest.setQuery("my show name s4");
        searchRequest.setSeason(4);
        searchRequest.setEpisode("21");

        CustomQueryAndTitleMapping customQueryAndTitleMapping = new CustomQueryAndTitleMapping("SEARCH;QUERY;{title:my show name}{group0:.*};{title} s{season:00}e{episode:00}");
        testee.mapSearchRequest(searchRequest, Collections.singletonList(customQueryAndTitleMapping));
        assertThat(searchRequest.getQuery()).isPresent().get().isEqualTo("my show name s04e21");
    }

    @Test
    public void shouldSkipMappingOfMetagroupsIfDataUnavailable() {
        final SearchRequest searchRequest = new SearchRequest();
        searchRequest.setQuery("my show name s4");

        CustomQueryAndTitleMapping customQueryAndTitleMapping = new CustomQueryAndTitleMapping("SEARCH;QUERY;{title:my show name}{group0:.*};{title} s{season:00}e{episode:00}");
        testee.mapSearchRequest(searchRequest, Collections.singletonList(customQueryAndTitleMapping));
        assertThat(searchRequest.getQuery()).isPresent().get().isEqualTo("my show name s4");
    }

    @Test
    public void shouldMapQueryForShowReplacingTheTitle() {
        final SearchRequest searchRequest = new SearchRequest();
        searchRequest.setQuery("my show name s4");
        searchRequest.setSeason(4);
        searchRequest.setEpisode("21");

        CustomQueryAndTitleMapping customQueryAndTitleMapping = new CustomQueryAndTitleMapping("SEARCH;QUERY;{title:my show name}{group0:.*};some other title I want{group0}");
        testee.mapSearchRequest(searchRequest, Collections.singletonList(customQueryAndTitleMapping));
        assertThat(searchRequest.getQuery()).isPresent().get().isEqualTo("some other title I want s4");
    }

    @Test
    public void shouldMapQueryJustReplacingWithoutGroup() {
        final SearchRequest searchRequest = new SearchRequest();
        searchRequest.setQuery("my show name s4");

        CustomQueryAndTitleMapping customQueryAndTitleMapping = new CustomQueryAndTitleMapping("SEARCH;QUERY;my show name.*;some other title I want");
        testee.mapSearchRequest(searchRequest, Collections.singletonList(customQueryAndTitleMapping));
        assertThat(searchRequest.getQuery()).isPresent().get().isEqualTo("some other title I want");
    }

    @Test
    public void shouldReplaceValueIfNotMatchingAll() {
        final SearchRequest searchRequest = new SearchRequest();
        searchRequest.setQuery("1my.show.name1");

        CustomQueryAndTitleMapping removeDots = new CustomQueryAndTitleMapping("SEARCH;QUERY;\\.; ;false");
        CustomQueryAndTitleMapping removeDigits = new CustomQueryAndTitleMapping("SEARCH;QUERY;\\d;;false");
        testee.mapSearchRequest(searchRequest, Arrays.asList(removeDots, removeDigits));
        assertThat(searchRequest.getQuery()).isPresent().get().isEqualTo("my show name");
    }

    @Test
    public void shouldMapTitleForShowReplacingTheTitle() {
        final SearchRequest searchRequest = new SearchRequest();
        searchRequest.setTitle("my show name");

        CustomQueryAndTitleMapping customQueryAndTitleMapping = new CustomQueryAndTitleMapping("SEARCH;TITLE;{title:my show name};some other title I want");
        testee.mapSearchRequest(searchRequest, Collections.singletonList(customQueryAndTitleMapping));
        assertThat(searchRequest.getTitle()).isPresent().get().isEqualTo("some other title I want");
    }

    @Test
    public void shouldFindMatchingDatasetQuery() {
        final SearchRequest searchRequest = new SearchRequest();

        searchRequest.setQuery("my show name s4");
        final CustomQueryAndTitleMapping customQueryAndTitleMapping = new CustomQueryAndTitleMapping("SEARCH;QUERY;{title:my show name}{group0:.*};{title} s{season:00}e{episode:00}");
        assertTrue(testee.isDatasetMatch(CustomQueryAndTitleMappingHandler.MetaData.fromSearchRequest(searchRequest), customQueryAndTitleMapping));

        searchRequest.setQuery("my show name whatever");
        assertTrue(testee.isDatasetMatch(CustomQueryAndTitleMappingHandler.MetaData.fromSearchRequest(searchRequest), customQueryAndTitleMapping));

        searchRequest.setQuery("my other show name");
        assertThat(testee.isDatasetMatch(CustomQueryAndTitleMappingHandler.MetaData.fromSearchRequest(searchRequest), customQueryAndTitleMapping)).isFalse();
    }

    @Test
    public void shouldFindMatchingDatasetTitle() {
        final SearchRequest searchRequest = new SearchRequest();
        searchRequest.setTitle("my wrongly mapped title");
        final CustomQueryAndTitleMapping customQueryAndTitleMapping = new CustomQueryAndTitleMapping("TVSEARCH;TITLE;{title:my wrongly mapped title};my correct title");
        assertTrue(testee.isDatasetMatch(CustomQueryAndTitleMappingHandler.MetaData.fromSearchRequest(searchRequest), customQueryAndTitleMapping));

        searchRequest.setTitle("my correctly mapped title");
        assertThat(testee.isDatasetMatch(CustomQueryAndTitleMappingHandler.MetaData.fromSearchRequest(searchRequest), customQueryAndTitleMapping)).isFalse();
    }

    @Test
    public void shouldReplaceAllCustomGroups() {
        final SearchRequest searchRequest = new SearchRequest();
        searchRequest.setSearchType(SearchType.TVSEARCH);
        searchRequest.setTitle("Fairy Tail 49");
        final CustomQueryAndTitleMapping customQueryAndTitleMapping = new CustomQueryAndTitleMapping("TVSEARCH;TITLE;{title:Fairy Tail} {ep:[0-9]+};{title} german e{ep}");
        assertTrue(testee.isDatasetMatch(CustomQueryAndTitleMappingHandler.MetaData.fromSearchRequest(searchRequest), customQueryAndTitleMapping));

        testee.mapSearchRequest(searchRequest, Collections.singletonList(customQueryAndTitleMapping));
        assertThat(searchRequest.getTitle()).isPresent().get().isEqualTo("Fairy Tail german e49");
    }


    @Test
    public void shouldMapSearchResult() {
        SearchResultItem item = new SearchResultItem();
        item.setTitle("Fairy Tail");
        item.getAttributes().put("season", "1");
        item.getAttributes().put("episode", "2");

        final CustomQueryAndTitleMapping customQueryAndTitleMapping = new CustomQueryAndTitleMapping("null;RESULT_TITLE;{title:.*};{title} {season:0} {episode:00}");
        final SearchResultItem newItem = testee.mapSearchResult(item, Collections.singletonList(customQueryAndTitleMapping));
        assertThat(newItem.getTitle()).isEqualTo("Fairy Tail 1 02");
    }

    @Test
    public void shouldTestSingleMappingRegardlessOfItsAffectedValue() {
        final CustomQueryAndTitleMapping mapping = new CustomQueryAndTitleMapping();
        mapping.setAffectedValue(AffectedValue.RESULT_TITLE);
        mapping.setSearchType(SearchType.SEARCH);
        mapping.setFrom("www\\.\\w*\\.\\w{2,5} \\- {title:.*}");
        mapping.setTo("{title}");
        final CustomQueryAndTitleMappingHandler.TestRequest testRequest = testRequest(List.of(mapping), 0, List.of("www.tamilblasters.de - hello"));

        final CustomQueryAndTitleMappingHandler.TestResponse response = testee.testMapping(testRequest);

        assertThat(response.getResults()).hasSize(1);
        final CustomQueryAndTitleMappingHandler.TestResult result = response.getResults().get(0);
        assertThat(result.getInput()).isEqualTo("www.tamilblasters.de - hello");
        assertThat(result.getThisMapping().isMatch()).isTrue();
        assertThat(result.getThisMapping().getOutput()).isEqualTo("hello");
        assertThat(result.getChain().getOutput()).isEqualTo("hello");
        assertThat(result.getChain().getAppliedIndices()).containsExactly(0);
    }

    @Test
    public void shouldTestExamplesAgainstEditedMappingAndChain() {
        final CustomQueryAndTitleMapping neverMatching = new CustomQueryAndTitleMapping("TVSEARCH;TITLE;nevermatches;whatever;false");
        final CustomQueryAndTitleMapping removeDots = new CustomQueryAndTitleMapping("SEARCH;QUERY;\\.; ;false");
        final CustomQueryAndTitleMapping addSeasonAndEpisode = new CustomQueryAndTitleMapping("SEARCH;QUERY;{t:.*};{t} s{season:00}e{episode:00};true");
        final CustomQueryAndTitleMappingHandler.TestRequest testRequest = testRequest(List.of(neverMatching, removeDots, addSeasonAndEpisode), 2, List.of("my.show", "other show"));

        final CustomQueryAndTitleMappingHandler.TestResponse response = testee.testMapping(testRequest);

        assertThat(response.getResults()).hasSize(2);
        final CustomQueryAndTitleMappingHandler.TestResult withDots = response.getResults().get(0);
        assertThat(withDots.getInput()).isEqualTo("my.show");
        assertThat(withDots.getThisMapping().isMatch()).isTrue();
        assertThat(withDots.getThisMapping().getOutput()).isEqualTo("my.show s01e02");
        assertThat(withDots.getThisMapping().getError()).isNull();
        assertThat(withDots.getChain().getOutput()).isEqualTo("my show s01e02");
        //Indices into the mappings as sent, not into the mappings which turned out to be relevant
        assertThat(withDots.getChain().getAppliedIndices()).containsExactly(1, 2);

        final CustomQueryAndTitleMappingHandler.TestResult withoutDots = response.getResults().get(1);
        assertThat(withoutDots.getThisMapping().getOutput()).isEqualTo("other show s01e02");
        assertThat(withoutDots.getChain().getOutput()).isEqualTo("other show s01e02");
        assertThat(withoutDots.getChain().getAppliedIndices()).containsExactly(2);
    }

    @Test
    public void shouldReportNoMatchForEditedMappingButStillTestChain() {
        final CustomQueryAndTitleMapping notMatching = new CustomQueryAndTitleMapping("SEARCH;QUERY;nevermatches;whatever;false");
        final CustomQueryAndTitleMapping matching = new CustomQueryAndTitleMapping("SEARCH;QUERY;show;series;false");
        final CustomQueryAndTitleMappingHandler.TestRequest testRequest = testRequest(List.of(notMatching, matching), 0, List.of("my show"));

        final CustomQueryAndTitleMappingHandler.TestResponse response = testee.testMapping(testRequest);

        final CustomQueryAndTitleMappingHandler.TestResult result = response.getResults().get(0);
        assertThat(result.getThisMapping().isMatch()).isFalse();
        assertThat(result.getThisMapping().getOutput()).isNull();
        assertThat(result.getThisMapping().getError()).isNull();
        assertThat(result.getChain().getOutput()).isEqualTo("my series");
        assertThat(result.getChain().getAppliedIndices()).containsExactly(1);
    }

    @Test
    public void shouldOnlyTestChainWhenNoMappingIndexIsSent() {
        final CustomQueryAndTitleMapping mapping = new CustomQueryAndTitleMapping("SEARCH;QUERY;show;series;false");
        final CustomQueryAndTitleMappingHandler.TestRequest testRequest = testRequest(List.of(mapping), null, List.of("my show"));

        final CustomQueryAndTitleMappingHandler.TestResponse response = testee.testMapping(testRequest);

        final CustomQueryAndTitleMappingHandler.TestResult result = response.getResults().get(0);
        assertThat(result.getThisMapping()).isNull();
        assertThat(result.getChain().getOutput()).isEqualTo("my series");
    }

    @Test
    public void shouldSkipDisabledMappingsInChain() {
        final CustomQueryAndTitleMapping disabled = new CustomQueryAndTitleMapping("SEARCH;QUERY;show;series;false");
        disabled.setEnabled(false);
        final CustomQueryAndTitleMappingHandler.TestRequest testRequest = testRequest(List.of(disabled), 0, List.of("my show"));

        final CustomQueryAndTitleMappingHandler.TestResponse response = testee.testMapping(testRequest);

        final CustomQueryAndTitleMappingHandler.TestResult result = response.getResults().get(0);
        assertThat(result.getThisMapping().isMatch()).isTrue();
        assertThat(result.getChain().getOutput()).isEqualTo("my show");
        assertThat(result.getChain().getAppliedIndices()).isEmpty();
    }

    @Test
    public void shouldAnswerBrokenMappingWithErrorInsteadOfFailing() {
        final CustomQueryAndTitleMapping broken = new CustomQueryAndTitleMapping();
        broken.setSearchType(SearchType.SEARCH);
        broken.setAffectedValue(AffectedValue.QUERY);
        broken.setFrom("[");
        broken.setTo("whatever");
        final CustomQueryAndTitleMappingHandler.TestRequest testRequest = testRequest(List.of(broken), 0, List.of("my show"));

        final CustomQueryAndTitleMappingHandler.TestResponse response = testee.testMapping(testRequest);

        final CustomQueryAndTitleMappingHandler.TestResult result = response.getResults().get(0);
        assertThat(result.getThisMapping().isMatch()).isFalse();
        assertThat(result.getThisMapping().getError()).isNotNull();
        assertThat(result.getChain().getError()).isNotNull();
        assertThat(result.getChain().getOutput()).isNull();
    }

    @Test
    public void shouldRejectTooManyExamples() {
        final CustomQueryAndTitleMapping mapping = new CustomQueryAndTitleMapping("SEARCH;QUERY;show;series;false");
        final List<String> tooManyExamples = IntStream.rangeClosed(0, CustomQueryAndTitleMappingHandler.MAX_EXAMPLES).mapToObj(x -> "example " + x).toList();
        final CustomQueryAndTitleMappingHandler.TestRequest testRequest = testRequest(List.of(mapping), 0, tooManyExamples);

        assertThatThrownBy(() -> testee.testMapping(testRequest))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(x -> ((ResponseStatusException) x).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    public void shouldAcceptMaximumNumberOfExamples() {
        final CustomQueryAndTitleMapping mapping = new CustomQueryAndTitleMapping("SEARCH;QUERY;show;series;false");
        final List<String> maximumExamples = IntStream.range(0, CustomQueryAndTitleMappingHandler.MAX_EXAMPLES).mapToObj(x -> "show " + x).toList();
        final CustomQueryAndTitleMappingHandler.TestRequest testRequest = testRequest(List.of(mapping), 0, maximumExamples);

        final CustomQueryAndTitleMappingHandler.TestResponse response = testee.testMapping(testRequest);

        assertThat(response.getResults()).hasSize(CustomQueryAndTitleMappingHandler.MAX_EXAMPLES);
    }

    private CustomQueryAndTitleMappingHandler.TestRequest testRequest(List<CustomQueryAndTitleMapping> mappings, Integer mappingIndex, List<String> examples) {
        final CustomQueryAndTitleMappingHandler.TestRequest testRequest = new CustomQueryAndTitleMappingHandler.TestRequest();
        testRequest.setMappings(mappings);
        testRequest.setMappingIndex(mappingIndex);
        testRequest.setExamples(examples);
        return testRequest;
    }

}
