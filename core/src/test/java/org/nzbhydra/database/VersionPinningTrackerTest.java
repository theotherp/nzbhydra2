package org.nzbhydra.database;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.nzbhydra.database.VersionPinningTracker.State;
import org.nzbhydra.database.VersionPinningTracker.Status;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class VersionPinningTrackerTest {

    private static final Instant START = Instant.parse("2026-11-18T10:00:00Z");

    private VersionPinningTracker testee;

    @BeforeEach
    void setUp() {
        testee = new VersionPinningTracker(Duration.ofMinutes(5), Duration.ofMinutes(30));
    }

    private static Instant minutes(long minutes) {
        return START.plus(Duration.ofMinutes(minutes));
    }

    @Test
    void shouldNotReportPinningWhileOldestVersionAdvances() {
        for (int i = 0; i <= 20; i++) {
            Status status = testee.update(1000 + i * 100, 999 + i * 100, minutes(i));
            assertThat(status.state()).isEqualTo(State.NOT_PINNED);
        }
    }

    @Test
    void shouldNotReportPinningWhenNothingIsWritten() {
        testee.update(1000, 1000, minutes(0));

        Status status = testee.update(1000, 1000, minutes(10));

        assertThat(status.state()).isEqualTo(State.NOT_PINNED);
    }

    @Test
    void shouldReportPinnedBeforeThresholdIsReached() {
        testee.update(1000, 1000, minutes(0));

        Status status = testee.update(1200, 1000, minutes(4));

        assertThat(status.state()).isEqualTo(State.PINNED);
        assertThat(status.pinnedFor()).isEqualTo(Duration.ofMinutes(4));
        assertThat(status.versionsBehind()).isEqualTo(200);
    }

    @Test
    void shouldWarnOnceThresholdIsReachedAndRepeatAfterInterval() {
        testee.update(1000, 1000, minutes(0));

        assertThat(testee.update(1500, 1000, minutes(5)).state()).isEqualTo(State.PINNED_WARN);
        assertThat(testee.update(1600, 1000, minutes(6)).state()).isEqualTo(State.PINNED);
        assertThat(testee.update(3000, 1000, minutes(34)).state()).isEqualTo(State.PINNED);
        Status repeated = testee.update(3100, 1000, minutes(35));

        assertThat(repeated.state()).isEqualTo(State.PINNED_WARN);
        assertThat(repeated.pinnedFor()).isEqualTo(Duration.ofMinutes(35));
    }

    @Test
    void shouldReportReleaseAfterWarningAndStartOver() {
        testee.update(1000, 1000, minutes(0));
        testee.update(1500, 1000, minutes(6));

        Status released = testee.update(1600, 1599, minutes(7));

        assertThat(released.state()).isEqualTo(State.RELEASED);
        assertThat(released.pinnedFor()).isEqualTo(Duration.ofMinutes(7));
        assertThat(testee.update(1700, 1699, minutes(8)).state()).isEqualTo(State.NOT_PINNED);
    }

    @Test
    void shouldNotReportReleaseWithoutPreviousWarning() {
        testee.update(1000, 1000, minutes(0));
        testee.update(1100, 1000, minutes(2));

        Status status = testee.update(1200, 1199, minutes(3));

        assertThat(status.state()).isEqualTo(State.NOT_PINNED);
    }
}
