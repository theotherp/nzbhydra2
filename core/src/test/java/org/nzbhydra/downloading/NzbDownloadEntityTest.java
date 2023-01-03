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

package org.nzbhydra.downloading;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

public class NzbDownloadEntityTest {


    @Test
    void shouldTruncatLongError() {
        FileDownloadEntity testee = new FileDownloadEntity();
        StringBuilder builder = new StringBuilder();
        for (int i = 1; i <= 799; i++) {
            builder.append("12345");
        }
        builder.append("abcdef");
        assertThat(builder.length()).isEqualTo(4001);
        testee.setError(builder.toString());
        assertThat(testee.getError()).endsWith("abcde");
    }


}