

package org.nzbhydra.web;

import jakarta.servlet.ServletRequest;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.filter.ForwardedHeaderFilter;
import org.springframework.web.util.UriComponents;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class UrlCalculatorTest {

    @Mock
    private ConfigurableEnvironment environmentMock;
    @Mock
    private HttpServletRequest requestMock;
    @InjectMocks
    private UrlCalculator testee = new UrlCalculator();


    @BeforeEach
    public void setUp() throws Exception {

    }

    @Test
    void shouldReturnNewBuilderEachTime() {
        prepareConfig(false, false, "/");
        prepareHeaders("127.0.0.1:5076", null, null, null);
        prepareServlet("http://127.0.0.1:5076", "127.0.0.1", 5076, "http", "/");
        testee = spy(testee);
        doReturn(requestMock).when(testee).getCurrentRequest();
        UriComponentsBuilder builder1 = testee.getRequestBasedUriBuilder();
        UriComponentsBuilder builder2 = testee.getRequestBasedUriBuilder();
        assertThat(builder1).isNotSameAs(builder2);
        builder1.path("path1");
        builder2.path("path2");
        assertThat(builder2.build().toUriString()).doesNotContain("path1");
    }


    @Test
    void shouldBuildCorrectlyForLocalAccessWithHttp() {
        prepareConfig(false, false, "/");
        prepareHeaders("127.0.0.1:5076", null, null, null);
        prepareServlet("http://127.0.0.1:5076", "127.0.0.1", 5076, "http", "/");
        UriComponentsBuilder builder = testee.buildLocalBaseUriBuilder(requestMock);

        assertThat(builder.build().getScheme()).isEqualTo("http");
        assertThat(builder.build().getHost()).isEqualTo("127.0.0.1");
        assertThat(builder.build().getPort()).isEqualTo(5076);
        assertThat(builder.build().getPath()).isEqualTo("/");
    }

    @Test
    void shouldBuildCorrectlyForLocalAccessWithContextPath() {
        prepareConfig(false, false, "/nzbhydra2");
        prepareHeaders("127.0.0.1:5076", null, null, null);
        prepareServlet("http://127.0.0.1:5076", "127.0.0.1", 5076, "http", "/nzbhydra2");
        UriComponentsBuilder builder = testee.buildLocalBaseUriBuilder(requestMock);

        assertThat(builder.build().getScheme()).isEqualTo("http");
        assertThat(builder.build().getHost()).isEqualTo("127.0.0.1");
        assertThat(builder.build().getPort()).isEqualTo(5076);
        assertThat(builder.build().getPath()).isEqualTo("/nzbhydra2");
    }


    @Test
    void shouldBuildCorrectlyForLocalAccessWithBindAllAccessedViaLocalhost() {
        prepareConfig(false, true, "/");
        prepareHeaders("127.0.0.1:5076", null, null, null);
        prepareServlet("http://127.0.0.1:5076", "127.0.0.1", 5076, "http", "/");
        UriComponentsBuilder builder = testee.buildLocalBaseUriBuilder(requestMock);

        assertThat(builder.build().getScheme()).isEqualTo("http");
        assertThat(builder.build().getHost()).isEqualTo("127.0.0.1");
        assertThat(builder.build().getPort()).isEqualTo(5076);
        assertThat(builder.build().getPath()).isEqualTo("/");
    }

    @Test
    void shouldBuildCorrectlyForLocalAccessWithBindAllAccessedViaNetworkAddress() {
        prepareConfig(false, true, "/");
        prepareHeaders("192.168.1.111:5076", null, null, null);
        prepareServlet("http://192.168.1.111:5076", "192.168.1.111", 5076, "http", "/");
        UriComponentsBuilder builder = testee.buildLocalBaseUriBuilder(requestMock);

        assertThat(builder.build().getScheme()).isEqualTo("http");
        assertThat(builder.build().getHost()).isEqualTo("192.168.1.111");
        assertThat(builder.build().getPort()).isEqualTo(5076);
        assertThat(builder.build().getPath()).isEqualTo("/");
    }

    //Forwarded headers are applied by the ForwardedHeaderFilter in the security filter chain (see SecurityConfig),
    //so these tests run the request through that filter like a real request

    @Test
    void shouldBuildCorrectlyForReverseProxyWithHttpAccessedViaLocalhost() throws Exception {
        prepareConfig(false, false, "/");
        HttpServletRequest request = forwardedRequest("127.0.0.1", 80, "/nzbhydra2", "127.0.0.1:4001", null, null); //nginx doesn't include the port in the "host" header

        assertUri(testee.buildLocalBaseUriBuilder(request), "http", "127.0.0.1", 4001, "/nzbhydra2");
    }

    @Test
    void shouldBuildCorrectlyForReverseProxyWithHttpAccessedViaNetworkAddress() throws Exception {
        prepareConfig(false, false, "/");
        HttpServletRequest request = forwardedRequest("192.168.1.111", 80, "/nzbhydra2", "192.168.1.111:4001", null, null);

        assertUri(testee.buildLocalBaseUriBuilder(request), "http", "192.168.1.111", 4001, "/nzbhydra2");
    }

    @Test
    void shouldBuildCorrectlyForReverseProxySendingForwardedPort() throws Exception {
        prepareConfig(false, false, "/");
        HttpServletRequest request = forwardedRequest("192.168.1.111", 80, "/nzbhydra2", "192.168.1.111", null, "4001"); //x-forwarded-host may not contain the port

        assertUri(testee.buildLocalBaseUriBuilder(request), "http", "192.168.1.111", 4001, "/nzbhydra2");
    }

    @Test
    void shouldBuildCorrectlyForReverseProxyWithHttpsAccessedViaLocalhost() throws Exception {
        prepareConfig(false, false, "/");
        HttpServletRequest request = forwardedRequest("127.0.0.1:4001", 80, "/nzbhydra2", "127.0.0.1:4001", "https", null);

        assertUri(testee.buildLocalBaseUriBuilder(request), "https", "127.0.0.1", 4001, "/nzbhydra2");
    }

    @Test
    void shouldBuildCorrectlyForReverseProxyWithHttpsAccessedViaNetworkAddress() throws Exception {
        prepareConfig(false, false, "/");
        HttpServletRequest request = forwardedRequest("192.168.1.111:4001", 80, "/nzbhydra2", "192.168.1.111:4001", "https", null);

        assertUri(testee.buildLocalBaseUriBuilder(request), "https", "192.168.1.111", 4001, "/nzbhydra2");
    }

    @Test
    void shouldBuildCorrectlyForReverseProxyWithHttpsOnPort443() throws Exception {
        prepareConfig(false, false, "/");
        HttpServletRequest request = forwardedRequest("localhost", 80, "/nzbhydra2", "localhost", "https", null);

        UriComponentsBuilder builder = testee.buildLocalBaseUriBuilder(request);

        assertUri(builder, "https", "localhost", -1, "/nzbhydra2");
        assertThat(builder.toUriString()).isEqualTo("https://localhost/nzbhydra2");
    }

    @Test
    void shouldBuildCorrectlyForReverseProxyWithHttpOnPort80AndNoPath() throws Exception {
        prepareConfig(false, false, "/");
        HttpServletRequest request = forwardedRequest("localhost", 80, "", "localhost", "http", null);

        UriComponentsBuilder builder = testee.buildLocalBaseUriBuilder(request);

        assertUri(builder, "http", "localhost", -1, "");
        assertThat(builder.toUriString()).isEqualTo("http://localhost");
    }

    @Test
    void shouldLeaveOutDefaultPortGivenInHostHeader() throws Exception {
        prepareConfig(false, false, "/");
        HttpServletRequest request = forwardedRequest("localhost:443", 80, "/nzbhydra2", "localhost:443", "https", null);

        assertThat(testee.buildLocalBaseUriBuilder(request).toUriString()).isEqualTo("https://localhost/nzbhydra2");
    }

    @Test
    void shouldKeepPortWhichIsTheDefaultOfTheOtherScheme() throws Exception {
        prepareConfig(false, false, "/");
        HttpServletRequest request = forwardedRequest("localhost:80", 80, "/nzbhydra2", "localhost:80", "https", null);

        assertThat(testee.buildLocalBaseUriBuilder(request).toUriString()).isEqualTo("https://localhost:80/nzbhydra2");
    }

    @Test
    void shouldCalculateBuilderOnlyOncePerRequest() {
        MockHttpServletRequest request = plainRequest("127.0.0.1:5076");
        UrlCalculator spy = spyReturning(request);

        UriComponentsBuilder builder1 = spy.getRequestBasedUriBuilder();
        UriComponentsBuilder builder2 = spy.getRequestBasedUriBuilder();

        assertThat(builder1.toUriString()).isEqualTo("http://127.0.0.1:5076");
        assertThat(builder2.toUriString()).isEqualTo("http://127.0.0.1:5076");
        verify(spy, times(1)).buildLocalBaseUriBuilder(request);
        assertThat(request.getAttribute(UrlCalculator.BUILDER_ATTRIBUTE)).isNotNull();
    }

    @Test
    void shouldNotShareBuilderBetweenRequests() {
        UrlCalculator spy = spyReturning(plainRequest("127.0.0.1:5076"));
        assertThat(spy.getRequestBasedUriBuilder().toUriString()).isEqualTo("http://127.0.0.1:5076");

        doReturn(plainRequest("192.168.1.111:4001")).when(spy).getCurrentRequest();

        assertThat(spy.getRequestBasedUriBuilder().toUriString()).isEqualTo("http://192.168.1.111:4001");
    }

    @Test
    void shouldNotReuseBuilderOfWrappedRequestForWrapper() throws Exception {
        prepareConfig(false, false, "/");
        MockHttpServletRequest rawRequest = new MockHttpServletRequest("GET", "/nzbhydra2/api");
        rawRequest.setServerName("127.0.0.1");
        rawRequest.setServerPort(80);
        rawRequest.setContextPath("/nzbhydra2");
        rawRequest.addHeader("host", "127.0.0.1:4001");
        rawRequest.addHeader("X-Forwarded-Proto", "https");
        UrlCalculator spy = spyReturning(rawRequest);
        assertThat(spy.getRequestBasedUriBuilder().build().getScheme()).isEqualTo("http");

        HttpServletRequest wrapped = applyForwardedHeaderFilter(rawRequest);
        doReturn(wrapped).when(spy).getCurrentRequest();

        assertThat(spy.getRequestBasedUriBuilder().build().getScheme()).isEqualTo("https");
    }

    private MockHttpServletRequest plainRequest(String host) {
        prepareConfig(false, false, "/");
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api");
        request.addHeader("host", host);
        return request;
    }

    private UrlCalculator spyReturning(HttpServletRequest request) {
        UrlCalculator spy = spy(testee);
        doReturn(request).when(spy).getCurrentRequest();
        return spy;
    }

    private HttpServletRequest forwardedRequest(String host, int serverPort, String contextPath, String forwardedHost, String forwardedProto, String forwardedPort) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", contextPath + "/api");
        request.setServerName(host.split(":")[0]);
        request.setServerPort(serverPort);
        request.setContextPath(contextPath);
        request.addHeader("host", host);
        request.addHeader("x-forwarded-for", "8.8.8.8"); //Calling IP which can be anything. Should not be used for host building
        request.addHeader("x-forwarded-host", forwardedHost);
        if (forwardedProto != null) {
            request.addHeader("x-forwarded-proto", forwardedProto);
        }
        if (forwardedPort != null) {
            request.addHeader("x-forwarded-port", forwardedPort);
        }
        return applyForwardedHeaderFilter(request);
    }

    private HttpServletRequest applyForwardedHeaderFilter(HttpServletRequest request) throws Exception {
        AtomicReference<ServletRequest> filtered = new AtomicReference<>();
        new ForwardedHeaderFilter().doFilter(request, new MockHttpServletResponse(), (req, res) -> filtered.set(req));
        return (HttpServletRequest) filtered.get();
    }

    private void assertUri(UriComponentsBuilder builder, String scheme, String host, int port, String path) {
        UriComponents uri = builder.build();
        assertThat(uri.getScheme()).isEqualTo(scheme);
        assertThat(uri.getHost()).isEqualTo(host);
        assertThat(uri.getPort()).isEqualTo(port);
        assertThat(uri.getPath()).isEqualTo(path);
    }

    protected void prepareServlet(String requestUrl, String serverName, int port, String scheme, String contextPath) {
        when(requestMock.getRequestURL()).thenReturn(new StringBuffer(requestUrl));
        when(requestMock.getServerName()).thenReturn(serverName);
        when(requestMock.getServerPort()).thenReturn(port);
        when(requestMock.getScheme()).thenReturn(scheme);
        when(requestMock.getContextPath()).thenReturn(contextPath);
    }

    protected void prepareHeaders(String host, String forwardedHost, String forwardedProto, String forwardedPort) {
        when(requestMock.getHeader("x-forwarded-for")).thenReturn("8.8.8.8"); //Calling IP which can be anything. Should not be used for host building
        when(requestMock.getHeader("x-forwarded-host")).thenReturn(forwardedHost);
        when(requestMock.getHeader("x-forwarded-proto")).thenReturn(forwardedProto);
        when(requestMock.getHeader("x-forwarded-port")).thenReturn(forwardedPort);
        when(requestMock.getHeader("host")).thenReturn(host);
    }

    protected void prepareConfig(boolean isSsl, boolean bindAll, String contextPath) {
        when(environmentMock.getProperty("server.ssl.enabled")).thenReturn(String.valueOf(isSsl));
        when(environmentMock.getProperty("server.address")).thenReturn(bindAll ? "0.0.0.0" : "127.0.0.1");
        when(environmentMock.getProperty("server.port")).thenReturn("5076");
        when(environmentMock.getProperty("server.servlet.context-path")).thenReturn(contextPath == null ? "/" : contextPath);
    }
}
