package org.nzbhydra.auth;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

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
}
