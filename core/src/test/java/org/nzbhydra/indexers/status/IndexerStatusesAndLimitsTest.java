package org.nzbhydra.indexers.status;

import org.junit.jupiter.api.Test;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class IndexerStatusesAndLimitsTest {

    @Test
    void shouldConvertH2TimestampsAndLocalDateTimesToInstants() {
        Instant instant = Instant.parse("2026-07-28T17:00:00Z");

        assertThat(IndexerStatusesAndLimits.toInstant(Timestamp.from(instant))).isEqualTo(instant);
        assertThat(IndexerStatusesAndLimits.toInstant(LocalDateTime.ofInstant(instant, ZoneOffset.UTC))).isEqualTo(instant);
    }
}
