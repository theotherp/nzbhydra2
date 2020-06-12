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

package org.nzbhydra.logging;

import org.junit.Test;

import static org.assertj.core.api.Assertions.assertThat;

public class SensitiveDataRemovingPatternLayoutEncoderTest {

    @Test
    public void shouldRemoveSensitiveData() {
        SensitiveDataRemovingPatternLayoutEncoder encoder = new SensitiveDataRemovingPatternLayoutEncoder();
        String result = encoder.removeSensitiveData("https://www.indexer.com/api?apikey=12345678&raw=0&t=search&q=abc");
        assertThat(result).isEqualTo("https://www.indexer.com/api?apikey=<apikey>&raw=0&t=search&q=abc");

        result = encoder.removeSensitiveData("https://www.indexer.com/api?apikey=12345678");
        assertThat(result).isEqualTo("https://www.indexer.com/api?apikey=<apikey>");

        result = encoder.removeSensitiveData("http://host:5076/nzbhydra2/getnzb/api/123?apikey%3D123&nzbname=filename.nzb");
        assertThat(result).isEqualTo("http://host:5076/nzbhydra2/getnzb/api/123?apikey%3D<apikey>&nzbname=filename.nzb");

        result = encoder.removeSensitiveData("https://www.indexer.com/api?t=search&apikey=12345678");
        assertThat(result).isEqualTo("https://www.indexer.com/api?t=search&apikey=<apikey>");

        result = encoder.removeSensitiveData("https://www.indexer.com/api?t=search&password=12345678");
        assertThat(result).isEqualTo("https://www.indexer.com/api?t=search&password=<password>");

        result = encoder.removeSensitiveData("https://www.indexer.com/api?t=search&password=12345678&q=abc");
        assertThat(result).isEqualTo("https://www.indexer.com/api?t=search&password=<password>&q=abc");

        result = encoder.removeSensitiveData("https://www.indexer.com/api?t=search&username=12345678");
        assertThat(result).isEqualTo("https://www.indexer.com/api?t=search&username=<username>");

        result = encoder.removeSensitiveData("https://www.indexer.com/api?t=search&username=12345678&q=abc");
        assertThat(result).isEqualTo("https://www.indexer.com/api?t=search&username=<username>&q=abc");
    }

}