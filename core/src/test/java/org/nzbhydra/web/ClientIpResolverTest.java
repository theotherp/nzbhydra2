package org.nzbhydra.web;

import jakarta.servlet.http.HttpServletRequestWrapper;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ClientIpResolverTest {

    @Test
    void shouldIgnoreForwardedForFromPublicPeer() {
        assertThat(ClientIpResolver.resolve("203.0.113.7", List.of("198.51.100.1"), null)).isEqualTo("203.0.113.7");
        assertThat(ClientIpResolver.resolve("203.0.113.7", List.of("127.0.0.1"), null)).isEqualTo("203.0.113.7");
    }

    @Test
    void shouldIgnoreRealIpFromPublicPeer() {
        assertThat(ClientIpResolver.resolve("203.0.113.7", List.of(), "198.51.100.1")).isEqualTo("203.0.113.7");
    }

    @Test
    void shouldUseRemoteAddressWithoutHeaders() {
        assertThat(ClientIpResolver.resolve("127.0.0.1", List.of(), null)).isEqualTo("127.0.0.1");
        assertThat(ClientIpResolver.resolve("203.0.113.7", null, null)).isEqualTo("203.0.113.7");
    }

    @Test
    void shouldTakeAddressAppendedByTrustedProxyAndIgnoreSpoofedEntries() {
        assertThat(ClientIpResolver.resolve("127.0.0.1", List.of("198.51.100.1, 203.0.113.7"), null)).isEqualTo("203.0.113.7");
        //Spoofing a private address on the left must not help either
        assertThat(ClientIpResolver.resolve("127.0.0.1", List.of("192.168.1.10, 203.0.113.7"), null)).isEqualTo("203.0.113.7");
    }

    @Test
    void shouldSkipChainOfTrustedProxies() {
        assertThat(ClientIpResolver.resolve("172.17.0.1", List.of("198.51.100.1, 203.0.113.7, 10.0.0.5, 192.168.1.1"), null)).isEqualTo("203.0.113.7");
    }

    @Test
    void shouldTakeLeftmostWhenAllEntriesAreTrusted() {
        assertThat(ClientIpResolver.resolve("127.0.0.1", List.of("192.168.1.20, 10.0.0.5"), null)).isEqualTo("192.168.1.20");
    }

    @Test
    void shouldCombineMultipleForwardedForHeaders() {
        assertThat(ClientIpResolver.resolve("127.0.0.1", List.of("198.51.100.1", "203.0.113.7"), null)).isEqualTo("203.0.113.7");
    }

    @Test
    void shouldHandleIpv6() {
        assertThat(ClientIpResolver.resolve("::1", List.of("2001:db8::1, 2001:db8::2"), null)).isEqualTo("2001:db8::2");
        assertThat(ClientIpResolver.resolve("0:0:0:0:0:0:0:1", List.of("[2001:db8::2]:4711"), null)).isEqualTo("2001:db8::2");
        assertThat(ClientIpResolver.resolve("fd00::1", List.of("2001:db8::2, fe80::1%eth0"), null)).isEqualTo("2001:db8::2");
        assertThat(ClientIpResolver.resolve("2001:db8::9", List.of("2001:db8::2"), null)).isEqualTo("2001:db8::9");
    }

    @Test
    void shouldStripPortsAndQuotes() {
        assertThat(ClientIpResolver.resolve("127.0.0.1", List.of("\"203.0.113.7:1234\""), null)).isEqualTo("203.0.113.7");
    }

    @Test
    void shouldStopAtGarbageAndUseClosestVerifiedAddress() {
        assertThat(ClientIpResolver.resolve("127.0.0.1", List.of("203.0.113.7, unknown"), null)).isEqualTo("127.0.0.1");
        assertThat(ClientIpResolver.resolve("127.0.0.1", List.of("203.0.113.7, not an ip, 10.0.0.5"), null)).isEqualTo("10.0.0.5");
        assertThat(ClientIpResolver.resolve("127.0.0.1", List.of("garbage, 203.0.113.7"), null)).isEqualTo("203.0.113.7");
        assertThat(ClientIpResolver.resolve("127.0.0.1", List.of(" , ,"), null)).isEqualTo("127.0.0.1");
        assertThat(ClientIpResolver.resolve("127.0.0.1", List.of("[2001:db8::1"), null)).isEqualTo("127.0.0.1");
        assertThat(ClientIpResolver.resolve("127.0.0.1", List.of("example.com"), null)).isEqualTo("127.0.0.1");
    }

    @Test
    void shouldUseRealIpFromTrustedPeer() {
        assertThat(ClientIpResolver.resolve("127.0.0.1", List.of(), "203.0.113.7")).isEqualTo("203.0.113.7");
        assertThat(ClientIpResolver.resolve("127.0.0.1", List.of(), "garbage")).isEqualTo("127.0.0.1");
        //X-Forwarded-For takes precedence
        assertThat(ClientIpResolver.resolve("127.0.0.1", List.of("198.51.100.1"), "203.0.113.7")).isEqualTo("198.51.100.1");
    }

    @Test
    void shouldRecogniseTrustedProxies() {
        assertThat(ClientIpResolver.isTrustedProxy("127.0.0.1")).isTrue();
        assertThat(ClientIpResolver.isTrustedProxy("10.1.2.3")).isTrue();
        assertThat(ClientIpResolver.isTrustedProxy("172.16.0.1")).isTrue();
        assertThat(ClientIpResolver.isTrustedProxy("172.31.255.255")).isTrue();
        assertThat(ClientIpResolver.isTrustedProxy("172.32.0.1")).isFalse();
        assertThat(ClientIpResolver.isTrustedProxy("192.168.0.1")).isTrue();
        assertThat(ClientIpResolver.isTrustedProxy("169.254.1.1")).isTrue();
        assertThat(ClientIpResolver.isTrustedProxy("::1")).isTrue();
        assertThat(ClientIpResolver.isTrustedProxy("fd12::1")).isTrue();
        assertThat(ClientIpResolver.isTrustedProxy("fe80::1")).isTrue();
        assertThat(ClientIpResolver.isTrustedProxy("::ffff:10.0.0.1")).isTrue();
        assertThat(ClientIpResolver.isTrustedProxy("100.64.0.1")).isTrue();
        assertThat(ClientIpResolver.isTrustedProxy("100.127.255.255")).isTrue();
        assertThat(ClientIpResolver.isTrustedProxy("100.128.0.1")).isFalse();
        assertThat(ClientIpResolver.isTrustedProxy("8.8.8.8")).isFalse();
        assertThat(ClientIpResolver.isTrustedProxy("2001:db8::1")).isFalse();
        assertThat(ClientIpResolver.isTrustedProxy("localhost")).isFalse();
        assertThat(ClientIpResolver.isTrustedProxy(null)).isFalse();
    }

    @Test
    void shouldResolveFromRequestIgnoringWrapperThatRewritesRemoteAddress() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("203.0.113.7");
        request.addHeader("X-Forwarded-For", "198.51.100.1");
        //Like the ForwardedHeaderFilter's wrapper, which takes the remote address from the first X-Forwarded-For entry
        HttpServletRequestWrapper wrapped = new HttpServletRequestWrapper(request) {
            @Override
            public String getRemoteAddr() {
                return "198.51.100.1";
            }
        };

        assertThat(ClientIpResolver.resolve(wrapped)).isEqualTo("203.0.113.7");
    }

    @Test
    void shouldResolveFromRequestHeaders() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("192.168.1.1");
        request.addHeader("X-Forwarded-For", "198.51.100.1, 203.0.113.7");

        assertThat(ClientIpResolver.resolve(request)).isEqualTo("203.0.113.7");

        MockHttpServletRequest realIpRequest = new MockHttpServletRequest();
        realIpRequest.setRemoteAddr("192.168.1.1");
        realIpRequest.addHeader("X-Real-IP", "203.0.113.8");
        assertThat(ClientIpResolver.resolve(realIpRequest)).isEqualTo("203.0.113.8");
    }

    @Test
    void shouldPreferValueResolvedByFilter() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("192.168.1.1");
        request.setAttribute(ClientIpResolver.CLIENT_IP_ATTRIBUTE, "203.0.113.9");

        assertThat(ClientIpResolver.resolve(request)).isEqualTo("203.0.113.9");
    }

    @Test
    void shouldTrustTailscalePeerButNotTreatCarrierGradeNatAsLocalNetwork() {
        assertThat(ClientIpResolver.resolve("100.101.102.103", List.of("203.0.113.7"), null)).isEqualTo("203.0.113.7");
        assertThat(ClientIpResolver.PRIVATE_NETWORK_RANGES).noneMatch(matcher -> matcher.matches("100.64.0.1"));
    }
}
