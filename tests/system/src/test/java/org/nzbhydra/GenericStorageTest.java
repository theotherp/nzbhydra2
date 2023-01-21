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

import org.apache.commons.lang3.RandomStringUtils;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ContextConfiguration;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ContextConfiguration(classes = {TestConfig.class})
public class GenericStorageTest {

    private static final String ENDPOINT = "/internalapi/genericstorage/";
    @Autowired
    private HydraClient hydraClient;

    @Test
    public void shouldPutAndGet() {
        final String key = RandomStringUtils.randomAlphabetic(10);
        assertThat(hydraClient.get(ENDPOINT + key).body()).isEqualTo("");
        hydraClient.put(ENDPOINT + key, "aBody");
        assertThat(hydraClient.get(ENDPOINT + key).body()).isEqualTo("aBody");
    }


}
