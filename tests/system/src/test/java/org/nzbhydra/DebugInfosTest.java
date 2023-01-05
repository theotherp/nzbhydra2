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
        final HydraResponse response = hydraClient.get("internalapi/debuginfos/currentlogfile");
        final String body = response.body();
        assertThat(body).contains("Started NzbHydra in");
    }

    @Test
    public void shouldListAndDownloadLog() throws Exception {
        HydraResponse response = hydraClient.get("internalapi/debuginfos/logfilenames");
        String body = response.body();
        final List<String> names = Jackson.JSON_MAPPER.readValue(body, new TypeReference<>() {
        });
        assertThat(names).isNotEmpty();
        response = hydraClient.get("internalapi/debuginfos/downloadlog", "logfilename=" + names.get(0));
        body = response.body();
        assertThat(body)
            .contains("Started NzbHydra in");
    }

    @Test
    public void shouldDownloadDebugInfosAsBytes() throws Exception {
        final HydraResponse response = hydraClient.get("internalapi/debuginfos/createAndProvideZipAsBytes");
        final String body = response.body();
        //Good enough that it was created
        assertThat(body).startsWith("PK");
    }

}
