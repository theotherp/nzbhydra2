

package org.nzbhydra.downloading.downloaders.sabnzbd;

import com.google.common.base.Charsets;
import com.google.common.io.Resources;
import org.junit.jupiter.api.Test;
import org.nzbhydra.downloading.downloaders.sabnzbd.mapping.HistoryResponse;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;

public class HistoryResponseTest {

    @Test
    void shouldParseHistoryResponseWithoutErrors() throws IOException {
        String json = Resources.toString(Resources.getResource(HistoryResponseTest.class, "historyResponse.json"), Charsets.UTF_8);
        ObjectMapper objectMapper = new JsonMapper();
        HistoryResponse response = objectMapper.readValue(json, HistoryResponse.class);
        assertThat(response.getHistory().getSlots().get(0).getDownloaded()).isEqualTo(24369063766787L);
    }

}