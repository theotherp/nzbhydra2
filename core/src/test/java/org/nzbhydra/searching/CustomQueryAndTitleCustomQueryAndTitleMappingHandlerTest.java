/*
 *  (C) Copyright 2021 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.searching;

import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.searching.AffectedValue;
import org.nzbhydra.config.searching.CustomQueryAndTitleMapping;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.searchrequests.SearchRequest;

import java.util.Arrays;
import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
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
    public void shouldTest() {
        CustomQueryAndTitleMappingHandler.TestRequest testRequest = new CustomQueryAndTitleMappingHandler.TestRequest();
        final CustomQueryAndTitleMapping mapping = new CustomQueryAndTitleMapping();
        mapping.setAffectedValue(AffectedValue.RESULT_TITLE);
        mapping.setSearchType(SearchType.SEARCH);
        mapping.setFrom("www\\.\\w*\\.\\w{2,5} \\- {title:.*}");
        mapping.setTo("{title}");
        testRequest.setMapping(mapping);
        testRequest.setExampleInput("www.tamilblasters.de - hello");
        final CustomQueryAndTitleMappingHandler.TestResponse response = testee.testMapping(testRequest);
        assertThat(response.isMatch()).isTrue();
        assertThat(response.getOutput()).isEqualTo("hello");
    }

}
