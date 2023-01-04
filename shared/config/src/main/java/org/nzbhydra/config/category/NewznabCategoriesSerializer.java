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

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.google.common.base.Joiner;

import java.io.IOException;
import java.util.List;

public class NewznabCategoriesSerializer extends JsonSerializer<List<List<Integer>>> {

    @Override
    public void serialize(List<List<Integer>> listOfLists, JsonGenerator gen, SerializerProvider serializers) throws IOException {
        gen.writeStartArray();
        for (List<Integer> integerList : listOfLists) {
            gen.writeString(Joiner.on("&").join(integerList));
        }
        gen.writeEndArray();
    }
}
