/*
 *  (C) Copyright 2025 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.indexers.torbox.mapping;

import org.junit.jupiter.api.Test;
import org.nzbhydra.Jackson;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;

class TorboxMappingTest {

    @Test
    public void shouldDeserializeTorrentSearchResult() throws IOException {
        TorboxSearchResponse torrentResponse = Jackson.JSON_MAPPER.readValue(getClass().getResource("/org/nzbhydra/mapping/torboxTorrentsImdbResponse.json"), TorboxSearchResponse.class);
        assertThat(torrentResponse).isNotNull();
        TorboxSearchResultsContainer container = torrentResponse.getData();
        assertThat(container).isNotNull();
        assertThat(container.getTorrents()).hasSize(2);
        assertThat(container.getTorrents().get(0).getTitle()).isEqualTo("The Crazy Android");

        TorboxSearchResponse usenetResponse = Jackson.JSON_MAPPER.readValue(getClass().getResource("/org/nzbhydra/mapping/torboxUsenetImdbResponse.json"), TorboxSearchResponse.class);
        assertThat(usenetResponse).isNotNull();
        container = usenetResponse.getData();
        assertThat(container).isNotNull();
        assertThat(container.getNzbs()).hasSize(2);
        assertThat(container.getNzbs().get(0).getTitle()).isEqualTo("The Crazy Android.");


    }

}