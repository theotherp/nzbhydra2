

package org.nzbhydra;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import tools.jackson.core.type.TypeReference;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SystemTest
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

    /**
     * The heap dump must work on the native image this suite usually runs against, where Spring Boot's own
     * {@code actuator/heapdump} answers 503 because there is no {@code HotSpotDiagnosticMXBean}. Only the first bytes
     * are read -- enough for the HPROF magic, which is only there if a dump was actually written -- because the whole
     * body is as large as the instance's live heap.
     */
    @Test
    public void shouldCreateHeapDump() throws Exception {
        final HydraResponse response = hydraClient.getFirstBytes("/internalapi/debuginfos/heapdump", 18);

        assertThat(response.status()).isEqualTo(200);
        assertThat(response.header("Content-Disposition")).contains(".hprof");
        assertThat(new String(response.bodyBytes(), StandardCharsets.US_ASCII)).startsWith("JAVA PROFILE 1.0");
    }

    @Test
    public void shouldDownloadDebugInfosAsBytes() throws Exception {
        final HydraResponse response = hydraClient.get("/internalapi/debuginfos/createAndProvideZipAsBytes");
        final String body = response.body();
        //Good enough that it was created
        assertThat(body).startsWith("PK");
    }

}
