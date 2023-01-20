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

package org.nzbhydra.config.category;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.google.common.base.Splitter;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

public class NewznabCategoriesDeserializer extends JsonDeserializer<List<List<Integer>>> {

    @Override
    public List<List<Integer>> deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        List<String> list = p.readValueAs(new TypeReference<List<String>>() {
        });

        return list.stream().map(x -> Splitter.on("&").splitToList(x).stream().map(Integer::valueOf).collect(Collectors.toList())).collect(Collectors.toList());
    }
}
