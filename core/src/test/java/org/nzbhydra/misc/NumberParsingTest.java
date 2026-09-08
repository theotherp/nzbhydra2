package org.nzbhydra.misc;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class NumberParsingTest {

    @Test
    void shouldParseValidNumbers() {
        assertThat(NumberParsing.parseIntOrNull("10")).isEqualTo(10);
        assertThat(NumberParsing.parseIntOrNull(" 10 ")).isEqualTo(10);
        assertThat(NumberParsing.parseLongOrNull("10000000000")).isEqualTo(10_000_000_000L);
        assertThat(NumberParsing.parseFloatOrNull("0.5")).isEqualTo(0.5F);
    }

    @Test
    void shouldReturnNullForInvalidNumbers() {
        assertThat(NumberParsing.parseIntOrNull(null)).isNull();
        assertThat(NumberParsing.parseIntOrNull("")).isNull();
        assertThat(NumberParsing.parseIntOrNull("  ")).isNull();
        assertThat(NumberParsing.parseIntOrNull("N/A")).isNull();
        assertThat(NumberParsing.parseIntOrNull("10000000000")).isNull();
        assertThat(NumberParsing.parseLongOrNull("N/A")).isNull();
        assertThat(NumberParsing.parseFloatOrNull("N/A")).isNull();
    }
}
