package org.nzbhydra.downloading;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DownloadContentTitleNormalizerTest {

    @Test
    void shouldNormalizeCaseAndCommonSeparators() {
        assertThat(DownloadContentTitleNormalizer.normalize("A.Release-Name_2026"))
                .isEqualTo(DownloadContentTitleNormalizer.normalize("a release.name 2026"));
    }
}
