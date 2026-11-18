package org.nzbhydra.database;

import java.time.Duration;
import java.time.Instant;

/**
 * Tracks H2's {@code info.OLDEST_VERS_TO_KEEP} against {@code info.CURRENT_VERSION}. MVStore only frees a dead chunk
 * once it is older than the oldest version still in use, and under READ COMMITTED every running statement keeps the
 * version it started on. While one statement runs for long, the oldest version stands still, nothing written since
 * can be freed and the file grows. This class detects such a period from periodic samples.
 */
class VersionPinningTracker {

    enum State {
        /**
         * The oldest version advanced, or no newer versions were written.
         */
        NOT_PINNED,
        /**
         * The oldest version stands still while newer versions are written, for less than the threshold or warned
         * about recently.
         */
        PINNED,
        /**
         * Pinned for at least the threshold; a warning is due.
         */
        PINNED_WARN,
        /**
         * The oldest version advanced after a warning was given.
         */
        RELEASED
    }

    record Status(State state, Duration pinnedFor, long versionsBehind) {
    }

    private final Duration warnThreshold;
    private final Duration warnRepeatInterval;

    private long oldestVersion = -1;
    private Instant pinnedSince;
    private Instant lastWarning;

    VersionPinningTracker(Duration warnThreshold, Duration warnRepeatInterval) {
        this.warnThreshold = warnThreshold;
        this.warnRepeatInterval = warnRepeatInterval;
    }

    Status update(long currentVersion, long oldestVersion, Instant now) {
        long versionsBehind = currentVersion - oldestVersion;
        if (oldestVersion != this.oldestVersion) {
            Duration pinnedFor = pinnedSince == null ? Duration.ZERO : Duration.between(pinnedSince, now);
            State state = lastWarning != null ? State.RELEASED : State.NOT_PINNED;
            reset(oldestVersion, now);
            return new Status(state, pinnedFor, versionsBehind);
        }
        //The version of the last commit is usually still the oldest one in use when nothing is written
        if (versionsBehind <= 1) {
            Duration pinnedFor = Duration.between(pinnedSince, now);
            State state = lastWarning != null ? State.RELEASED : State.NOT_PINNED;
            reset(oldestVersion, now);
            return new Status(state, pinnedFor, versionsBehind);
        }
        Duration pinnedFor = Duration.between(pinnedSince, now);
        if (pinnedFor.compareTo(warnThreshold) >= 0
            && (lastWarning == null || Duration.between(lastWarning, now).compareTo(warnRepeatInterval) >= 0)) {
            lastWarning = now;
            return new Status(State.PINNED_WARN, pinnedFor, versionsBehind);
        }
        return new Status(State.PINNED, pinnedFor, versionsBehind);
    }

    private void reset(long oldestVersion, Instant now) {
        this.oldestVersion = oldestVersion;
        pinnedSince = now;
        lastWarning = null;
    }
}
