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

import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ContextConfiguration;

@SpringBootTest
@ContextConfiguration(classes = {TestConfig.class})
public class WebTest {

    @Autowired
    private HydraClient hydraClient;

    @Test
    public void shouldNotGet404() {
        Assertions.assertThat(hydraClient.get("/favicon.ico").getStatus())
                .as("Resource /favicon.ico should be returned")
                .isNotEqualTo(404);
        Assertions.assertThat(hydraClient.get("/static/css/additional.css").getStatus())
                .as("Resource /static/css/additional.css should be returned")
                .isNotEqualTo(404);
        Assertions.assertThat(hydraClient.get("/static/js/additional.js").getStatus())
                .as("Resource /static/js/additional.js should be returned")
                .isNotEqualTo(404);
    }

}
