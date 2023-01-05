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
import org.nzbhydra.historystats.SortModel;
import org.nzbhydra.historystats.stats.HistoryRequest;
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
        searcher.searchExternalApi("historyTest2");

        HistoryRequest historyRequest = new HistoryRequest();
        //Sort by time descending
        historyRequest.setSortModel(new SortModel("time", 0));

        HydraPage<SearchEntityTO> page = hydraClient.post("internalapi/history/searches", historyRequest)
            .as(new TypeReference<>() {
            });
        assertThat(page.empty).isFalse();
        assertThat(page.content).anyMatch(x -> "historyTest".equals(x.getQuery()));
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
