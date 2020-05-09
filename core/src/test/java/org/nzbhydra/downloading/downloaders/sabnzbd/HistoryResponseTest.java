/*
 *  (C) Copyright 2017 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.downloading.downloaders.sabnzbd;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.base.Charsets;
import com.google.common.io.Resources;
import org.junit.Test;
import org.nzbhydra.downloading.downloaders.sabnzbd.mapping.HistoryResponse;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;

public class HistoryResponseTest {

    @Test
    public void shouldParseHistoryResponseWithoutErrors() throws IOException {
        String json = Resources.toString(Resources.getResource(HistoryResponseTest.class, "historyResponse.json"), Charsets.UTF_8);
        ObjectMapper objectMapper = new ObjectMapper();
        HistoryResponse response = objectMapper.readValue(json, HistoryResponse.class);
        assertThat(response.getHistory().getSlots().get(0).getDownloaded()).isEqualTo(24369063766787L);
    }

}