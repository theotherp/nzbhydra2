

package org.nzbhydra.logging;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

public class SensitiveDataRemovingPatternLayoutEncoderTest {

    @Test
    void shouldRemoveSensitiveData() {
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

        final String darrApiKeyField = " \"name\": \"apiKey\",\n" +
                "      \"label\": \"API Key\",\n" +
                "      \"value\": \"12345678\",";
        result = encoder.removeSensitiveData(darrApiKeyField);
        assertThat(result).isEqualTo(darrApiKeyField.replace("12345678", "<apikey>"));

        final String darrUrlField = " \"name\": \"baseUrl\",\n" +
                "      \"label\": \"URL\",\n" +
                "      \"value\": \"http://127.0.0.1:5076\",";
        result = encoder.removeSensitiveData(darrUrlField);
        assertThat(result).isEqualTo(darrUrlField.replace("http://127.0.0.1:5076", "<url>"));

        final String darrUrlField2 = "\"name\" : \"baseUrl\",\n" +
                "    \"value\" : \"http://127.0.0.1:5076\"";
        result = encoder.removeSensitiveData(darrUrlField2);
        assertThat(result).isEqualTo(darrUrlField2.replace("http://127.0.0.1:5076", "<url>"));

        final String darrUrlField3 = "\"name\" : \"baseUrl\",\n" +
                "    \"value\" : \"http://host.docker.internal:5076/torznab\"";
        result = encoder.removeSensitiveData(darrUrlField3);
        assertThat(result).isEqualTo(darrUrlField3.replace("http://host.docker.internal:5076/torznab", "<url>"));
    }

}