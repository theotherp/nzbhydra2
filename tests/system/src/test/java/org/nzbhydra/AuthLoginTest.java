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

import org.junit.jupiter.api.Test;
import org.nzbhydra.config.auth.AuthType;
import org.nzbhydra.hydraconfigure.ConfigManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ContextConfiguration;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ContextConfiguration(classes = {TestConfig.class})
public class AuthLoginTest {

    private static final Logger logger = LoggerFactory.getLogger(AuthLoginTest.class);

    @Autowired
    private HydraClient hydraClient;

    @Autowired
    private ConfigManager configManager;

    @Test
    public void shouldRequireLogin() {
        if (configManager.getCurrentConfig().getAuth().getAuthType() == AuthType.NONE) {
            return;
        }

        HydraResponse hydraResponse = hydraClient.get("/config/main", Collections.singletonMap("Authorization", "Basic " + new String(Base64.getEncoder().encode("wrong:password".getBytes(StandardCharsets.UTF_8))))).dontRaiseIfUnsuccessful();
        assertThat(hydraResponse.getStatus()).isEqualTo(401);
        hydraResponse = hydraClient.get("/config/main", Collections.singletonMap("Authorization", "Basic " + new String(Base64.getEncoder().encode("test:test".getBytes(StandardCharsets.UTF_8)))));
        assertThat(hydraResponse.getStatus()).isEqualTo(200);
    }


}
