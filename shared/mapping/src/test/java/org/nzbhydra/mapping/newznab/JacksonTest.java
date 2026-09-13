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

package org.nzbhydra.mapping.newznab;

import org.junit.jupiter.api.Test;
import org.nzbhydra.searching.dtoseventsenums.SearchResultWebTO;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;

public class JacksonTest {

    @Test
    public void shouldSerializeAndDeserialize() {
        SearchResultWebTO result = new SearchResultWebTO();
        result.setAge("age");
        ObjectMapper objectMapper = new ObjectMapper();
        String json = objectMapper.writeValueAsString(result);
        SearchResultWebTO deserialized = objectMapper.readValue(json, SearchResultWebTO.class);
        assertThat(deserialized).isEqualTo(result);
    }
}
