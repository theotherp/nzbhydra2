/*
 *  (C) Copyright 2025 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.auth;

import org.apache.catalina.connector.Request;
import org.apache.tomcat.util.buf.MessageBytes;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import static org.nzbhydra.auth.HydraEmbeddedServletContainer.parseRequest;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class HydraEmbeddedServletContainerTest {

    @Mock
    private Request request;
    @Mock
    private MessageBytes serverNameMB;
    @Mock
    private org.apache.coyote.Request coyoteRequest;

    @BeforeEach
    void setUp() {
        when(request.getCoyoteRequest()).thenReturn(coyoteRequest);
        when(coyoteRequest.serverName()).thenReturn(serverNameMB);
        when(request.getHeader("X-Forwarded-Port")).thenReturn(null);
        when(request.getHeader("X-Forwarded-Host")).thenReturn(null);
        when(request.getHeader("X-Forwarded-Proto")).thenReturn(null);
//        when(request.getHeader("host")).thenReturn(null);
    }

    @Test
    void shouldHandleForwardedPort() {
        when(request.getHeader("X-Forwarded-Port")).thenReturn("8443");
        when(request.getHeader("host")).thenReturn("host");
        when(request.getServerPort()).thenReturn(8080);

        HydraEmbeddedServletContainer.Result result = parseRequest(request);

        verify(request).setServerPort(8443);
        assertThat(result.originalPort()).isEqualTo(8080);
        assertThat(result.forwardedPort()).isEqualTo("8443");
    }

    @Test
    void shouldIgnoreInvalidForwardedPort() {
        when(request.getHeader("X-Forwarded-Port")).thenReturn("invalid");
        when(request.getServerPort()).thenReturn(8080);
        when(request.getHeader("host")).thenReturn("host");

        HydraEmbeddedServletContainer.Result result = parseRequest(request);

        verify(request, never()).setServerPort(anyInt());
        assertThat(result.originalPort()).isEqualTo(8080);
    }

    @Test
    void shouldHandleForwardedHost() {
        when(request.getHeader("X-Forwarded-Host")).thenReturn("example.com");
        when(serverNameMB.getString()).thenReturn("original.com");

        HydraEmbeddedServletContainer.Result result = parseRequest(request);

        verify(serverNameMB).setString("example.com");
        assertThat(result.originalServerName()).isEqualTo("original.com");
        assertThat(result.forwardedHost()).isEqualTo("example.com");
    }

    @Test
    void shouldHandleIpv6ForwardedHost() {
        when(request.getHeader("X-Forwarded-Host")).thenReturn("[2001:db8:85a3:8d3:1319:8a2e:370:7348]:443");
        when(serverNameMB.getString()).thenReturn("original.com");
        when(request.getServerPort()).thenReturn(8080);

        HydraEmbeddedServletContainer.Result result = parseRequest(request);

        verify(request).setServerPort(443);
        verify(serverNameMB).setString("[2001:db8:85a3:8d3:1319:8a2e:370:7348]");
        assertThat(result.originalPort()).isEqualTo(8080);
        assertThat(result.forwardedHost()).isEqualTo("[2001:db8:85a3:8d3:1319:8a2e:370:7348]");
    }

    @Test
    void shouldHandleForwardedHostWithPort() {
        when(request.getHeader("X-Forwarded-Host")).thenReturn("example.com:9443");
        when(serverNameMB.getString()).thenReturn("original.com");
        when(request.getServerPort()).thenReturn(8080);

        HydraEmbeddedServletContainer.Result result = parseRequest(request);

        verify(request).setServerPort(9443);
        verify(serverNameMB).setString("example.com");
        assertThat(result.originalPort()).isEqualTo(8080);
        assertThat(result.forwardedHost()).isEqualTo("example.com");
    }

    @Test
    void shouldFallbackToHostHeader() {
        when(request.getHeader("X-Forwarded-Host")).thenReturn(null);
        when(request.getHeader("host")).thenReturn("example.com");
        when(serverNameMB.getString()).thenReturn("original.com");

        HydraEmbeddedServletContainer.Result result = parseRequest(request);

        verify(serverNameMB).setString("example.com");
        assertThat(result.forwardedHost()).isEqualTo("example.com");
    }

    @Test
    void shouldHandleMultipleForwardedHosts() {
        when(request.getHeader("X-Forwarded-Host")).thenReturn("example.com, proxy.com");
        when(serverNameMB.getString()).thenReturn("original.com");

        HydraEmbeddedServletContainer.Result result = parseRequest(request);

        verify(serverNameMB).setString("example.com");
        assertThat(result.forwardedHost()).isEqualTo("example.com");
    }

    @Test
    void shouldHandleForwardedProto() {
        when(request.getHeader("X-Forwarded-Proto")).thenReturn("https");
        when(request.getHeader("host")).thenReturn("host");
        when(request.isSecure()).thenReturn(false);

        HydraEmbeddedServletContainer.Result result = parseRequest(request);

        verify(request).setSecure(true);
        assertThat(result.originallySecure()).isFalse();
    }

    @Test
    void shouldHandleNoHeaders() {
        when(request.getHeader(anyString())).thenReturn(null);

        HydraEmbeddedServletContainer.Result result = parseRequest(request);

        verify(request, never()).setServerPort(anyInt());
        verify(serverNameMB, never()).setString(anyString());
        verify(request, never()).setSecure(anyBoolean());
        assertThat(result.originalPort()).isEqualTo(-1);
        assertThat(result.originalServerName()).isNull();
        assertThat(result.originallySecure()).isNull();
    }

}