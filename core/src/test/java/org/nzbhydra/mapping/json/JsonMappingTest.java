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

package org.nzbhydra.mapping.json;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.base.Charsets;
import com.google.common.io.Resources;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.nzbhydra.mapping.newznab.json.NewznabJsonRoot;
import org.springframework.test.context.junit.jupiter.SpringExtension;

@ExtendWith(SpringExtension.class)
public class JsonMappingTest {


    @Test
    void shouldSerializeToJson() throws Exception {
        ObjectMapper objectMapper = new ObjectMapper();
        String json = Resources.toString(Resources.getResource(JsonMappingTest.class, ("nzbsorg_3items.json").toLowerCase()), Charsets.UTF_8);
        NewznabJsonRoot root = objectMapper.readValue(json, NewznabJsonRoot.class);
        System.out.println(json);
    }


}
