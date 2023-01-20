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
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.Test;
import org.nzbhydra.config.indexer.CapsCheckRequest;
import org.nzbhydra.mediainfo.MediaInfoTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ContextConfiguration;

import java.util.List;

@SpringBootTest
@ContextConfiguration(classes = {TestConfig.class})
public class MediaInfoTest {

    @Autowired
    private HydraClient hydraClient;

    @Test
    public void shouldAutocompleteTV() throws Exception {
        CapsCheckRequest capsCheckRequest = new CapsCheckRequest();

        List<MediaInfoTO> checkCapsResponses = hydraClient.get("internalapi/autocomplete/TV", "input=Lost").as(new TypeReference<>() {
        });
        Assertions.assertThat(checkCapsResponses)
            .isNotEmpty()
            .first(AssertFactories.MediaInfoTO)
            .hasTvmazeId("123")
            .hasTitle("Lost")
            .hasYear(2004);
    }

    @Test
    public void shouldAutocompleteMovie() throws Exception {
        CapsCheckRequest capsCheckRequest = new CapsCheckRequest();

        List<MediaInfoTO> checkCapsResponses = hydraClient.get("internalapi/autocomplete/MOVIE", "input=Gladiator").as(new TypeReference<>() {
        });
        Assertions.assertThat(checkCapsResponses).isNotEmpty()
            .first(AssertFactories.MediaInfoTO)
            .hasTmdbId("98");
    }


}
