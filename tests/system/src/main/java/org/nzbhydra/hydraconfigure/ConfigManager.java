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

package org.nzbhydra.hydraconfigure;

import com.fasterxml.jackson.core.JsonProcessingException;
import org.nzbhydra.HydraClient;
import org.nzbhydra.Jackson;
import org.nzbhydra.config.BaseConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class ConfigManager {

    @Autowired
    private HydraClient hydraClient;

    public BaseConfig getCurrentConfig() {
        try {
            return Jackson.JSON_MAPPER.readValue(hydraClient.get("internalapi/config").raiseIfUnsuccessful().body(), BaseConfig.class);
        } catch (JsonProcessingException e) {
            throw new RuntimeException(e);
        }
    }

    public void setConfig(BaseConfig baseConfig) {
        try {
            hydraClient.put("internalapi/config", Jackson.JSON_MAPPER.writeValueAsString(baseConfig)).raiseIfUnsuccessful();
        } catch (JsonProcessingException e) {
            throw new RuntimeException(e);
        }
    }
}
