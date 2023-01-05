/*
 *  (C) Copyright 2023 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra;

import com.fasterxml.jackson.core.type.TypeReference;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.junit.jupiter.api.Test;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.historystats.SortModel;
import org.nzbhydra.historystats.stats.HistoryRequest;
import org.nzbhydra.searching.db.IdentifierKeyValuePairTO;
import org.nzbhydra.searching.db.SearchEntityTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ContextConfiguration;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ContextConfiguration(classes = {TestConfig.class})
public class HistoryTest {

    @Autowired
    private HydraClient hydraClient;

    @Autowired
    private Searcher searcher;


    @Test
    public void shouldShowSearchHistory() throws Exception {
        searcher.searchExternalApi("historyTest");
        searcher.searchExternalApiMovie("imdbid");
        searcher.searchExternalApiTV("tvmazeid", 1, 2);

        HistoryRequest historyRequest = new HistoryRequest();
        //Sort by time descending
        historyRequest.setSortModel(new SortModel("time", 0));

        HydraPage<SearchEntityTO> page = hydraClient.post("internalapi/history/searches", historyRequest)
            .as(new TypeReference<>() {
            });

        assertThat(page.empty).isFalse();

        final SearchEntityTO tvSearch = page.getContent().get(0);
        assertThat(tvSearch.getIdentifiers()).contains(new IdentifierKeyValuePairTO("TVMAZE", "tvmazeid"));
        assertThat(tvSearch.getSeason()).isEqualTo(1);
        assertThat(tvSearch.getEpisode()).isEqualTo("2");
        assertThat(tvSearch.getSearchType()).isEqualTo(SearchType.TVSEARCH);

        final SearchEntityTO movieSearch = page.getContent().get(1);
        assertThat(movieSearch.getIdentifiers()).contains(new IdentifierKeyValuePairTO("IMDB", "ttimdbid"));
        assertThat(movieSearch.getSearchType()).isEqualTo(SearchType.MOVIE);

        final SearchEntityTO querySearch = page.getContent().get(2);
        assertThat(querySearch.getSearchType()).isEqualTo(SearchType.SEARCH);
        assertThat(querySearch.getQuery()).isEqualTo("historyTest");
        assertThat(querySearch.getUserAgent()).isEqualTo("Other");

        assertThat(tvSearch.getTime()).isAfter(movieSearch.getTime());
        assertThat(movieSearch.getTime()).isAfter(querySearch.getTime());

        //Sort by time ascending
        historyRequest.setSortModel(new SortModel("time", 1));

        page = hydraClient.post("internalapi/history/searches", historyRequest)
            .as(new TypeReference<>() {
            });
        assertThat(page.getContent().get(0).getTime()).isBefore(page.getContent().get(1).getTime());
    }

    @Test
    public void shouldShowSearchHistoryForSearching() throws Exception {
        searcher.searchInternal("internalQueryForHistoryTest");

        HistoryRequest historyRequest = new HistoryRequest();
        //Sort by time descending
        historyRequest.setSortModel(new SortModel("time", 0));

        List<SearchEntityTO> list = hydraClient.post("internalapi/history/searches/forsearching", historyRequest)
            .as(new TypeReference<>() {
            });
        assertThat(list).isNotEmpty();
        assertThat(list.get(0).getQuery()).isEqualTo("internalQueryForHistoryTest");
    }

    @Data
    @NoArgsConstructor
    private static class HydraPage<T> {

        private List<T> content;
        private boolean last;
        private int totalPages;
        private int totalElements;
        private int size;
        private boolean first;
        private boolean empty;

    }


}
