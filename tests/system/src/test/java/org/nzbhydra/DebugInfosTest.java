

package org.nzbhydra;

import com.fasterxml.jackson.core.type.TypeReference;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ContextConfiguration;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ContextConfiguration(classes = {TestConfig.class})
public class DebugInfosTest {

    @Autowired
    private HydraClient hydraClient;

    @Test
    public void shouldDownloadCurrentLog() throws Exception {
        final HydraResponse response = hydraClient.get("/internalapi/debuginfos/currentlogfile");
        final String body = response.body();
        assertThat(body).contains("Started NzbHydra in");
    }

    @Test
    @Disabled
    public void shouldLogThreadDump() throws Exception {
        final HydraResponse response = hydraClient.get("/internalapi/debuginfos/logThreadDump");
        final String body = response.body();
        assertThat(body).contains("Thread name:");
    }

    @Test
    public void shouldListAndDownloadLog() throws Exception {
        HydraResponse response = hydraClient.get("/internalapi/debuginfos/logfilenames");
        String body = response.body();
        final List<String> names = Jackson.JSON_MAPPER.readValue(body, new TypeReference<>() {
        });
        assertThat(names).isNotEmpty();
        response = hydraClient.get("/internalapi/debuginfos/downloadlog", "logfilename=" + names.get(0));
        body = response.body();
        assertThat(body)
            .contains("Started NzbHydra in");
    }

    @Test
    public void shouldDownloadDebugInfosAsBytes() throws Exception {
        final HydraResponse response = hydraClient.get("/internalapi/debuginfos/createAndProvideZipAsBytes");
        final String body = response.body();
        //Good enough that it was created
        assertThat(body).startsWith("PK");
    }

}
