package org.nzbhydra.searching;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SearchResultIdCalculatorTest {

    @Test
    void shouldAlwaysUseUtf8ForHashingRegardlessOfThePlatformDefaultCharset() {
        //Pinned so that a change of the used charset (which would change all externally visible result IDs) fails
        assertThat(SearchResultIdCalculator.hash64("Der Bär, der Öl trinkt äöüß")).isEqualTo(1497703054410456286L);
        assertThat(SearchResultIdCalculator.hash64("An ASCII title")).isEqualTo(7413882420435762635L);
    }

}
