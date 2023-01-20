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


import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import lombok.Data;

@Data
public class HydraResponse {


    private final String body;
    private final int status;
    private boolean dontThrowExceptionOnErrorStatus;

    public HydraResponse(String body, int status) {
        this.body = body;
        this.status = status;
    }

    public String body() {
        return body;
    }

    public int status() {
        return status;
    }


    public HydraResponse raiseIfUnsuccessful() {
        return this;
    }

    public <T> T as(Class<T> clazz) {
        if (!dontThrowExceptionOnErrorStatus && status != 200) {
            throw new RuntimeException("Unsuccessful HTTP call. Status: " + status + ". Body:\n" + body);

        }
        try {
            return Jackson.JSON_MAPPER
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
                .readValue(body, clazz);
        } catch (JsonProcessingException e) {
            throw new RuntimeException(e);
        }
    }

    public <T> T as(TypeReference<T> tTypeReference) {
        if (!dontThrowExceptionOnErrorStatus && status != 200) {
            throw new RuntimeException("Unsuccessful HTTP call. Status: " + status + ". Body:\n" + body);

        }
        try {
            return Jackson.JSON_MAPPER
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
                .readValue(body, tTypeReference);
        } catch (JsonProcessingException e) {
            throw new RuntimeException(e);
        }
    }


}
