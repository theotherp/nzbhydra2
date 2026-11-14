

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

        final String darrApiKeyField = """
                "name": "apiKey",
                     "label": "API Key",
                     "value": "12345678",""";
        result = encoder.removeSensitiveData(darrApiKeyField);
        assertThat(result).isEqualTo(darrApiKeyField.replace("12345678", "<apikey>"));

        final String darrUrlField = """
                "name": "baseUrl",
                     "label": "URL",
                     "value": "http://127.0.0.1:5076",""";
        result = encoder.removeSensitiveData(darrUrlField);
        assertThat(result).isEqualTo(darrUrlField.replace("http://127.0.0.1:5076", "<url>"));

        final String darrUrlField2 = """
                "name" : "baseUrl",
                    "value" : "http://127.0.0.1:5076"\
                """;
        result = encoder.removeSensitiveData(darrUrlField2);
        assertThat(result).isEqualTo(darrUrlField2.replace("http://127.0.0.1:5076", "<url>"));

        final String darrUrlField3 = """
                "name" : "baseUrl",
                    "value" : "http://host.docker.internal:5076/torznab"\
                """;
        result = encoder.removeSensitiveData(darrUrlField3);
        assertThat(result).isEqualTo(darrUrlField3.replace("http://host.docker.internal:5076/torznab", "<url>"));
    }

    @Test
    void shouldLeaveLineWithNothingToRedactUnchanged() {
        SensitiveDataRemovingPatternLayoutEncoder encoder = new SensitiveDataRemovingPatternLayoutEncoder();
        String line = "2026-11-14 12:00:00.000  INFO --- [main] o.n.s.Searcher : Searching for \"abc\" in 3 indexers";
        assertThat(encoder.removeSensitiveData(line)).isEqualTo(line);
    }

    @Test
    void shouldRedactQueryParametersCaseInsensitivelyAndWithColon() {
        SensitiveDataRemovingPatternLayoutEncoder encoder = new SensitiveDataRemovingPatternLayoutEncoder();
        assertThat(encoder.removeSensitiveData("https://www.indexer.com/api?APIKEY=12345678&t=search"))
                .isEqualTo("https://www.indexer.com/api?APIKEY=<APIKEY>&t=search");
        assertThat(encoder.removeSensitiveData("Password:secret123 used"))
                .isEqualTo("Password:<Password> used");
        assertThat(encoder.removeSensitiveData("https://www.indexer.com/getnzb?r=abcdef&id=1"))
                .isEqualTo("https://www.indexer.com/getnzb?r=<r>&id=1");
    }

    @Test
    void shouldRedactArrApiKeyWithoutLabel() {
        SensitiveDataRemovingPatternLayoutEncoder encoder = new SensitiveDataRemovingPatternLayoutEncoder();
        final String darrApiKeyField = """
                "name" : "apiKey",
                    "value" : "12345678"\
                """;
        assertThat(encoder.removeSensitiveData(darrApiKeyField)).isEqualTo(darrApiKeyField.replace("12345678", "<apikey>"));
    }

    @Test
    void shouldRedactArrApiKeyAndBaseUrlInSameLine() {
        SensitiveDataRemovingPatternLayoutEncoder encoder = new SensitiveDataRemovingPatternLayoutEncoder();
        final String fields = """
                [{"name": "baseUrl", "value": "http://127.0.0.1:5076"}, {"name": "apiKey", "value": "12345678"}]""";
        assertThat(encoder.removeSensitiveData(fields))
                .isEqualTo(fields.replace("http://127.0.0.1:5076", "<url>").replace("12345678", "<apikey>"));
    }

    @Test
    void shouldLeaveOtherArrFieldsUnchanged() {
        SensitiveDataRemovingPatternLayoutEncoder encoder = new SensitiveDataRemovingPatternLayoutEncoder();
        final String field = """
                "name": "categories",
                     "value": "2000,5000",""";
        assertThat(encoder.removeSensitiveData(field)).isEqualTo(field);
    }

    @Test
    void shouldNotRedactWhenDisabled() {
        SensitiveDataRemovingPatternLayoutEncoder encoder = new SensitiveDataRemovingPatternLayoutEncoder();
        SensitiveDataRemovingPatternLayoutEncoder.setDisabled(true);
        try {
            String line = "https://www.indexer.com/api?apikey=12345678";
            assertThat(encoder.removeSensitiveData(line)).isEqualTo(line);
        } finally {
            SensitiveDataRemovingPatternLayoutEncoder.setDisabled(false);
        }
    }

}