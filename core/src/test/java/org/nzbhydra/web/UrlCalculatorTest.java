/*
 *  (C) Copyright 2017 TheOtherP (theotherp@gmx.de)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.nzbhydra.web;

import org.junit.Before;
import org.junit.Ignore;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.web.util.UriComponentsBuilder;

import javax.servlet.http.HttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

//Doesn't work anymore after moving to spring boot 2.2 (See #506)
@Ignore
public class UrlCalculatorTest {

    @Mock
    private ConfigurableEnvironment environmentMock;
    @Mock
    private HttpServletRequest requestMock;
    @InjectMocks
    private UrlCalculator testee = new UrlCalculator();


    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
    }

    @Test
    public void shouldReturnNewBuilderEachTime() {
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
    public void shouldBuildCorrectlyForLocalAccessWithHttp() {
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
    public void shouldBuildCorrectlyForLocalAccessWithContextPath() {
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
    public void shouldBuildCorrectlyForLocalAccessWithBindAllAccessedViaLocalhost() {
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
    public void shouldBuildCorrectlyForLocalAccessWithBindAllAccessedViaNetworkAddress() {
        prepareConfig(false, true, "/");
        prepareHeaders("192.168.1.111:5076", null, null, null);
        prepareServlet("http://192.168.1.111:5076", "192.168.1.111", 5076, "http", "/");
        UriComponentsBuilder builder = testee.buildLocalBaseUriBuilder(requestMock);

        assertThat(builder.build().getScheme()).isEqualTo("http");
        assertThat(builder.build().getHost()).isEqualTo("192.168.1.111");
        assertThat(builder.build().getPort()).isEqualTo(5076);
        assertThat(builder.build().getPath()).isEqualTo("/");
    }

    @Test
    public void shouldBuildCorrectlyForReverseProxyWithHttpAccessedViaLocalhost() {
        prepareConfig(false, false, "/nzbhydra2");
        prepareHeaders("127.0.0.1", "127.0.0.1:4001", null, null); //nginx doesn't include the port in the "host" header
        prepareServlet("http://127.0.0.1:4001", "127.0.0.1", 80, "http", "/nzbhydra2"); //nginx reports port 80 in the servlet
        UriComponentsBuilder builder = testee.buildLocalBaseUriBuilder(requestMock);

        assertThat(builder.build().getScheme()).isEqualTo("http");
        assertThat(builder.build().getHost()).isEqualTo("127.0.0.1");
        assertThat(builder.build().getPort()).isEqualTo(4001);
        assertThat(builder.build().getPath()).isEqualTo("/nzbhydra2");
    }

    @Test
    public void shouldBuildCorrectlyForReverseProxyWithHttpAccessedViaNetworkAddress() {
        prepareConfig(false, false, "/nzbhydra2");
        prepareHeaders("192.168.1.111", "192.168.1.111:4001", null, null); //nginx doesn't include the port in the "host" header
        prepareServlet("192.168.1.111:4001", "192.168.1.111", 80, "http", "/nzbhydra2"); //nginx reports port 80 in the servlet
        UriComponentsBuilder builder = testee.buildLocalBaseUriBuilder(requestMock);

        assertThat(builder.build().getScheme()).isEqualTo("http");
        assertThat(builder.build().getHost()).isEqualTo("192.168.1.111");
        assertThat(builder.build().getPort()).isEqualTo(4001);
        assertThat(builder.build().getPath()).isEqualTo("/nzbhydra2");
    }

    @Test
    public void shouldBuildCorrectlyForReverseProxySendingForwardedPort() {
        prepareConfig(false, false, "/nzbhydra2");
        prepareHeaders("192.168.1.111", "192.168.1.111", null, "4001"); //x-forwarded-host may not contain the port
        prepareServlet("192.168.1.111:4001", "192.168.1.111", 80, "http", "/nzbhydra2"); //nginx reports port 80 in the servlet
        UriComponentsBuilder builder = testee.buildLocalBaseUriBuilder(requestMock);

        assertThat(builder.build().getScheme()).isEqualTo("http");
        assertThat(builder.build().getHost()).isEqualTo("192.168.1.111");
        assertThat(builder.build().getPort()).isEqualTo(4001);
        assertThat(builder.build().getPath()).isEqualTo("/nzbhydra2");
    }

    @Test
    public void shouldBuildCorrectlyForReverseProxyWithHttpsAccessedViaLocalhost() {
        prepareConfig(false, false, "/nzbhydra2");
        prepareHeaders("127.0.0.1:4001", "127.0.0.1:4001", "https", null);
        prepareServlet("http://127.0.0.1:4001", "127.0.0.1", 80, "http", "/nzbhydra2"); //nginx reports port 80 and scheme http in the servlet
        UriComponentsBuilder builder = testee.buildLocalBaseUriBuilder(requestMock);

        assertThat(builder.build().getScheme()).isEqualTo("https");
        assertThat(builder.build().getHost()).isEqualTo("127.0.0.1");
        assertThat(builder.build().getPort()).isEqualTo(4001);
        assertThat(builder.build().getPath()).isEqualTo("/nzbhydra2");
    }

    @Test
    public void shouldBuildCorrectlyForReverseProxyWithHttpsAccessedViaNetworkAddress() {
        prepareConfig(false, false, "/nzbhydra2");
        prepareHeaders("192.168.1.111:4001", "192.168.1.111:4001", "https", null);
        prepareServlet("192.168.1.111:4001", "192.168.1.111", 80, "http", "/nzbhydra2"); //nginx reports port 80 and scheme in the servlet
        UriComponentsBuilder builder = testee.buildLocalBaseUriBuilder(requestMock);

        assertThat(builder.build().getScheme()).isEqualTo("https");
        assertThat(builder.build().getHost()).isEqualTo("192.168.1.111");
        assertThat(builder.build().getPort()).isEqualTo(4001);
        assertThat(builder.build().getPath()).isEqualTo("/nzbhydra2");
    }

    @Test
    public void shouldBuildCorrectlyForReverseProxyWithHttpsOnPort443() {
        prepareConfig(false, false, "/nzbhydra2");
        prepareHeaders("localhost", "localhost", "https", null);
        prepareServlet("localhost", "localhost", 443, "http", "/nzbhydra2"); //nginx reports port 80 and scheme in the servlet
        UriComponentsBuilder builder = testee.buildLocalBaseUriBuilder(requestMock);

        assertThat(builder.build().getScheme()).isEqualTo("https");
        assertThat(builder.build().getHost()).isEqualTo("localhost");
        assertThat(builder.build().getPort()).isEqualTo(-1);
        assertThat(builder.build().getPath()).isEqualTo("/nzbhydra2");
    }

    @Test
    public void shouldBuildCorrectlyForReverseProxyWithHttpOnPort80AndNoPath() {
        prepareConfig(false, false, "/");
        prepareHeaders("localhost", "localhost", "http", null);
        prepareServlet("localhost", "localhost", 80, "http", "/"); //nginx reports port 80 and scheme in the servlet
        UriComponentsBuilder builder = testee.buildLocalBaseUriBuilder(requestMock);

        assertThat(builder.build().getScheme()).isEqualTo("http");
        assertThat(builder.build().getHost()).isEqualTo("localhost");
        assertThat(builder.build().getPort()).isEqualTo(-1);
        assertThat(builder.build().getPath()).isEqualTo("/");
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