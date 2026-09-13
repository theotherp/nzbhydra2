package org.nzbhydra.downloading;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DownloadIdentifierTest {

    @Test
    void shouldParseLegacyNumericIdentifier() throws Exception {
        DownloadIdentifier identifier = DownloadIdentifier.parse("-7679241197840884187", false);

        assertThat(identifier.searchResultId()).isEqualTo(-7679241197840884187L);
        assertThat(identifier.searchId()).isNull();
        assertThat(identifier).hasToString("-7679241197840884187");
    }

    @Test
    void shouldParseContextualIdentifier() throws Exception {
        DownloadIdentifier identifier = DownloadIdentifier.parse("-7679241197840884187.12345", false);

        assertThat(identifier.searchResultId()).isEqualTo(-7679241197840884187L);
        assertThat(identifier.searchId()).isEqualTo(12345);
        assertThat(identifier).hasToString("-7679241197840884187.12345");
    }

    @Test
    void shouldParseNegativeSearchContext() throws Exception {
        DownloadIdentifier identifier = DownloadIdentifier.parse("42.-12345", false);

        assertThat(identifier.searchResultId()).isEqualTo(42L);
        assertThat(identifier.searchId()).isEqualTo(-12345);
    }

    @Test
    void shouldRejectNullIdentifierAsInvalid() {
        assertThatThrownBy(() -> DownloadIdentifier.parse(null, false))
                .isInstanceOf(InvalidSearchResultIdException.class);
    }
}
