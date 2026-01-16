

package org.nzbhydra.downloading.downloaders.sabnzbd;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.base.Charsets;
import com.google.common.io.Resources;
import org.junit.jupiter.api.Test;
import org.nzbhydra.downloading.downloaders.sabnzbd.mapping.QueueResponse;

import java.io.IOException;

public class QueueResponseTest {

    @Test
    void shouldParseQueueResponseWithoutErrors() throws IOException {
        String json = Resources.toString(Resources.getResource(QueueResponseTest.class, "queueResponse.json"), Charsets.UTF_8);
        ObjectMapper objectMapper = new ObjectMapper();
        QueueResponse response = objectMapper.readValue(json, QueueResponse.class);
    }

}