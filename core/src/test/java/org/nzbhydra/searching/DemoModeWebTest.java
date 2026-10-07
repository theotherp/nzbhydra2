package org.nzbhydra.searching;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.nzbhydra.web.SessionStorage;

import static org.assertj.core.api.Assertions.assertThat;

class DemoModeWebTest {

    private final DemoModeWeb testee = new DemoModeWeb();

    @AfterEach
    void tearDown() {
        SessionStorage.username.remove();
        DemoModeWeb.removeUserFromDemoMode("victim");
        DemoModeWeb.removeUserFromDemoMode("AnonymousUser");
    }

    @Test
    void shouldNotActivateDemoModeForOtherUserViaSpoofedAnonymousRequest() throws Exception {
        //The Interceptor no longer takes the username from the request parameter for internal requests, so the thread local stays empty
        org.springframework.mock.web.MockHttpServletRequest request = new org.springframework.mock.web.MockHttpServletRequest("PUT", "/internalapi/demomode");
        request.setRequestURI("/internalapi/demomode");
        request.setParameter("username", "victim");
        var interceptor = new org.nzbhydra.web.Interceptor();
        org.springframework.test.util.ReflectionTestUtils.setField(interceptor, "configProvider", org.mockito.Mockito.mock(org.nzbhydra.config.ConfigProvider.class, org.mockito.Mockito.RETURNS_DEEP_STUBS));
        org.springframework.test.util.ReflectionTestUtils.setField(interceptor, "userAgentMapper", org.mockito.Mockito.mock(org.nzbhydra.misc.UserAgentMapper.class));
        interceptor.preHandle(request, new org.springframework.mock.web.MockHttpServletResponse(), new Object());

        testee.activateDemoMode(null);

        assertThat(DemoModeWeb.isDemoModeActive(() -> "victim")).isFalse();
        assertThat(DemoModeWeb.isDemoModeActive(null)).isTrue();
    }

    @Test
    void shouldUsePrincipalOverSessionUsername() {
        SessionStorage.username.set("victim");

        testee.activateDemoMode(() -> "alice");

        assertThat(DemoModeWeb.isDemoModeActive(() -> "alice")).isTrue();
        assertThat(DemoModeWeb.isDemoModeActive(() -> "victim")).isFalse();
        DemoModeWeb.removeUserFromDemoMode("alice");
    }
}
