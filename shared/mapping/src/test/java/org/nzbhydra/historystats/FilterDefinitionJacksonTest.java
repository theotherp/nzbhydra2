/*
 *  (C) Copyright 2026 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.historystats;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;

class FilterDefinitionJacksonTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void shouldDeserializeWithoutTheVestigialIsBooleanField() {
        // The React search-history client (FM-020) never sends "isBoolean".
        String json = "{\"filterType\":\"freetext\",\"filterValue\":\"foo\"}";

        FilterDefinition deserialized = objectMapper.readValue(json, FilterDefinition.class);

        assertThat(deserialized.getFilterType()).isEqualTo("freetext");
        assertThat(deserialized.getFilterValue()).isEqualTo("foo");
    }

    @Test
    void shouldDeserializeWithTheIsBooleanFieldPresent() {
        // The React download-history client (FM-022) sends "isBoolean": false
        // as a padding workaround for this exact defect; it must keep working.
        String json = "{\"filterType\":\"freetext\",\"filterValue\":\"foo\",\"isBoolean\":false}";

        FilterDefinition deserialized = objectMapper.readValue(json, FilterDefinition.class);

        assertThat(deserialized.getFilterType()).isEqualTo("freetext");
        assertThat(deserialized.getFilterValue()).isEqualTo("foo");
    }
}
