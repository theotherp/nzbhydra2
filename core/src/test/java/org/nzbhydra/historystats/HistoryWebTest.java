package org.nzbhydra.historystats;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.nzbhydra.searching.db.SearchEntity;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class HistoryWebTest {

    private final History history = mock(History.class);

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        HistoryWeb historyWeb = new HistoryWeb();
        ReflectionTestUtils.setField(historyWeb, "history", history);
        mockMvc = MockMvcBuilders.standaloneSetup(historyWeb).build();
    }

    @Test
    void shouldAnswerARejectedHistoryRequestWithBadRequest() throws Exception {
        when(history.getHistory(any(), eq(History.SEARCH_TABLE), eq(SearchEntity.class)))
                .thenThrow(new InvalidHistoryRequestException("Unknown filter column"));

        mockMvc.perform(post("/internalapi/history/searches")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"page\":1,\"limit\":25,\"filterModel\":{\"x) OR (1=1\":{\"filterType\":\"freetext\",\"filterValue\":\"a\"}}}"))
                .andExpect(status().isBadRequest());
    }
}
