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

package org.nzbhydra.notifications;

import org.junit.jupiter.api.Test;
import org.nzbhydra.Jackson;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

public class NotificationEntityTest {
    private final NotificationEntity testee = new NotificationEntity();

    @Test
    public void shouldBeConvertibleToTO() throws Exception {
        testee.setTime(Instant.now());
        testee.setBody("body");
        testee.setId(1);
        testee.setUrls("urls");
        testee.setMessageType(NotificationMessageType.INFO);
        testee.setDisplayed(true);
        testee.setTitle("title");


        final NotificationEntityTO to = Jackson.JSON_MAPPER.convertValue(testee, NotificationEntityTO.class);
        final String jsonTO = Jackson.JSON_MAPPER.writeValueAsString(to);
        final String jsonEntity = Jackson.JSON_MAPPER.writeValueAsString(testee);
        assertThat(jsonTO).isEqualTo(jsonEntity);
    }

}
