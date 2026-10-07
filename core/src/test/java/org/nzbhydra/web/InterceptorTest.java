package org.nzbhydra.web;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Answers;
import org.mockito.junit.jupiter.MockitoExtension;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.misc.UserAgentMapper;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class InterceptorTest {

    @InjectMocks
    private Interceptor testee;
    @Mock(answer = Answers.RETURNS_DEEP_STUBS, strictness = Mock.Strictness.LENIENT)
    private ConfigProvider configProvider;
    @Mock
    private UserAgentMapper userAgentMapper;

    @BeforeEach
    void setUp() {
        SessionStorage.username.remove();
        SessionStorage.IP.remove();
    }

    @AfterEach
    void tearDown() {
        SessionStorage.username.remove();
        SessionStorage.IP.remove();
    }

    private MockHttpServletRequest request(String uri, String remoteUser, String usernameParam) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", uri);
        request.setRequestURI(uri);
        request.setRemoteUser(remoteUser);
        if (usernameParam != null) {
            request.setParameter("username", usernameParam);
        }
        return request;
    }

    @Test
    void shouldIgnoreUsernameParameterForInternalApi() throws Exception {
        testee.preHandle(request("/internalapi/history/searches/forsearching", null, "alice"), new MockHttpServletResponse(), new Object());

        assertThat(SessionStorage.username.get()).isNull();
    }

    @Test
    void shouldIgnoreUsernameParameterForWebPages() throws Exception {
        testee.preHandle(request("/", null, "alice"), new MockHttpServletResponse(), new Object());

        assertThat(SessionStorage.username.get()).isNull();
    }

    @Test
    void shouldIgnoreUsernameParameterOnPathsMerelyStartingWithApiPrefix() throws Exception {
        testee.preHandle(request("/apiary", null, "alice"), new MockHttpServletResponse(), new Object());

        assertThat(SessionStorage.username.get()).isNull();
    }

    @Test
    void shouldHonourUsernameParameterForApiKeyDownloadPaths() throws Exception {
        testee.preHandle(request("/getnzb/api/123", null, "alice"), new MockHttpServletResponse(), new Object());
        assertThat(SessionStorage.username.get()).isEqualTo("alice");

        testee.preHandle(request("/gettorrent/api/123", null, "bob"), new MockHttpServletResponse(), new Object());
        assertThat(SessionStorage.username.get()).isEqualTo("bob");
    }

    @Test
    void shouldHonourUsernameParameterForApi() throws Exception {
        testee.preHandle(request("/api", null, "alice"), new MockHttpServletResponse(), new Object());

        assertThat(SessionStorage.username.get()).isEqualTo("alice");
    }

    @Test
    void shouldNeverOverrideRealRemoteUser() throws Exception {
        testee.preHandle(request("/getnzb/api/123", "bob", "alice"), new MockHttpServletResponse(), new Object());

        assertThat(SessionStorage.username.get()).isEqualTo("bob");
    }

    @Test
    void shouldNotTakeIpFromForwardedForSentByPublicClient() throws Exception {
        MockHttpServletRequest request = request("/", null, null);
        request.setRemoteAddr("203.0.113.7");
        request.addHeader("X-Forwarded-For", "198.51.100.1");

        testee.preHandle(request, new MockHttpServletResponse(), new Object());

        assertThat(SessionStorage.IP.get()).isEqualTo("203.0.113.7");
    }

    @Test
    void shouldTakeIpFromForwardedForSentByLocalProxy() throws Exception {
        MockHttpServletRequest request = request("/", null, null);
        request.setRemoteAddr("127.0.0.1");
        request.addHeader("X-Forwarded-For", "198.51.100.1, 203.0.113.7");

        testee.preHandle(request, new MockHttpServletResponse(), new Object());

        assertThat(SessionStorage.IP.get()).isEqualTo("203.0.113.7");
    }

    @Test
    void shouldUseIpResolvedByFilter() throws Exception {
        MockHttpServletRequest request = request("/", null, null);
        request.setRemoteAddr("198.51.100.1");
        request.setAttribute(ClientIpResolver.CLIENT_IP_ATTRIBUTE, "203.0.113.7");

        testee.preHandle(request, new MockHttpServletResponse(), new Object());

        assertThat(SessionStorage.IP.get()).isEqualTo("203.0.113.7");
    }
}
