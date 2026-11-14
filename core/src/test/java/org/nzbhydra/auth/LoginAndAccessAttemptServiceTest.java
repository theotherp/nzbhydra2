package org.nzbhydra.auth;

import com.google.common.cache.Cache;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.entry;

class LoginAndAccessAttemptServiceTest {

    private LoginAndAccessAttemptService testee;

    @BeforeEach
    void setUp() {
        testee = new LoginAndAccessAttemptService();
    }

    private void failFiveTimes(String... ips) {
        for (int i = 0; i < 5; i++) {
            testee.accessFailed(ips[i % ips.length]);
        }
    }

    @Test
    void shouldBlockAfterFiveFailures() {
        for (int i = 0; i < 4; i++) {
            testee.accessFailed("203.0.113.7");
        }
        assertThat(testee.isBlocked("203.0.113.7")).isFalse();
        assertThat(testee.wasUnsuccessfulBefore("203.0.113.7")).isTrue();

        testee.accessFailed("203.0.113.7");

        assertThat(testee.isBlocked("203.0.113.7")).isTrue();
        assertThat(testee.isBlocked("203.0.113.8")).isFalse();
    }

    @Test
    void shouldResetAfterSuccess() {
        failFiveTimes("203.0.113.7");

        testee.accessSucceeded("203.0.113.7");

        assertThat(testee.isBlocked("203.0.113.7")).isFalse();
        assertThat(testee.wasUnsuccessfulBefore("203.0.113.7")).isFalse();
    }

    @Test
    void shouldCountIpv6AddressesPerSlash64() {
        failFiveTimes("2001:db8:1:2::1", "2001:db8:1:2::2", "2001:db8:1:2:aaaa:bbbb:cccc:dddd", "[2001:db8:1:2::4]", "2001:0db8:0001:0002:0000:0000:0000:0005");

        assertThat(testee.isBlocked("2001:db8:1:2:ffff::1")).isTrue();
        assertThat(testee.isBlocked("2001:db8:1:3::1")).isFalse();
    }

    @Test
    void shouldResetWholeSlash64AfterSuccess() {
        failFiveTimes("2001:db8:1:2::1");

        testee.accessSucceeded("2001:db8:1:2::99");

        assertThat(testee.isBlocked("2001:db8:1:2::1")).isFalse();
    }

    @Test
    void shouldKeepIpv4AndHostKeysUnchanged() {
        assertThat(LoginAndAccessAttemptService.toKey("203.0.113.7")).isEqualTo("203.0.113.7");
        assertThat(LoginAndAccessAttemptService.toKey("some.host")).isEqualTo("some.host");
        assertThat(LoginAndAccessAttemptService.toKey("::ffff:203.0.113.7")).isEqualTo("203.0.113.7");
        assertThat(LoginAndAccessAttemptService.toKey("2001:db8:1:2:3:4:5:6")).isEqualTo("2001:db8:1:2::/64");
        assertThat(LoginAndAccessAttemptService.toKey("fe80::1%eth0")).isEqualTo("fe80::/64");
        assertThat(LoginAndAccessAttemptService.toKey(null)).isNull();
    }

    @Test
    void shouldNotBlockUnknownIp() {
        assertThat(testee.isBlocked(null)).isFalse();
    }

    @Test
    void shouldNotCreateEntriesOnReads() {
        testee.isBlocked("203.0.113.7");
        testee.wasUnsuccessfulBefore("203.0.113.8");
        testee.isBlocked("2001:db8:1:2::1");

        assertThat(getAttemptsCache().size()).isZero();
        assertThat(testee.isBlocked("203.0.113.7")).isFalse();
        assertThat(testee.wasUnsuccessfulBefore("203.0.113.8")).isFalse();
    }

    @Test
    void shouldStoreOnlyFailedKeys() {
        testee.isBlocked("203.0.113.9");
        testee.accessFailed("203.0.113.7");
        testee.accessFailed("203.0.113.7");

        assertThat(getAttemptsCache().asMap()).containsExactly(entry("203.0.113.7", 2));
    }

    @Test
    void shouldKeepCountingFailuresWithReadsInBetween() {
        for (int i = 0; i < 4; i++) {
            assertThat(testee.isBlocked("203.0.113.7")).isFalse();
            testee.accessFailed("203.0.113.7");
            assertThat(testee.wasUnsuccessfulBefore("203.0.113.7")).isTrue();
        }
        assertThat(testee.isBlocked("203.0.113.7")).isFalse();

        testee.accessFailed("203.0.113.7");

        assertThat(testee.isBlocked("203.0.113.7")).isTrue();
        assertThat(testee.isBlocked("203.0.113.7")).isTrue();
        assertThat(testee.wasUnsuccessfulBefore("203.0.113.7")).isTrue();
        assertThat(getAttemptsCache().getIfPresent("203.0.113.7")).isEqualTo(5);
    }

    @Test
    void shouldStayBlockedAndKeepCountingAfterFurtherFailures() {
        failFiveTimes("203.0.113.7");

        testee.accessFailed("203.0.113.7");

        assertThat(testee.isBlocked("203.0.113.7")).isTrue();
        assertThat(getAttemptsCache().getIfPresent("203.0.113.7")).isEqualTo(6);
    }

    @Test
    void shouldTreatUnknownIpAsUnsuccessfulBefore() {
        assertThat(testee.wasUnsuccessfulBefore(null)).isTrue();
        assertThat(getAttemptsCache().size()).isZero();
    }

    @SuppressWarnings("unchecked")
    private Cache<String, Integer> getAttemptsCache() {
        return (Cache<String, Integer>) ReflectionTestUtils.getField(testee, "attemptsCache");
    }
}
