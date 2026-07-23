

package org.nzbhydra.downloading.downloaders.sabnzbd;

import com.google.common.base.Charsets;
import com.google.common.io.Resources;
import org.junit.jupiter.api.Test;
import org.nzbhydra.downloading.downloaders.sabnzbd.mapping.QueueResponse;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;

public class QueueResponseTest {

    @Test
    void shouldParseQueueResponseWithoutErrors() throws IOException {
        String json = Resources.toString(Resources.getResource(QueueResponseTest.class, "queueResponse.json"), Charsets.UTF_8);
        ObjectMapper objectMapper = new JsonMapper();
        QueueResponse response = objectMapper.readValue(json, QueueResponse.class);
    }

}