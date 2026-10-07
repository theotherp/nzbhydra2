package org.nzbhydra.fortests;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.access.annotation.Secured;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DebugWebTest {

    @Mock
    private ConfigProvider configProvider;
    @InjectMocks
    private DebugWeb testee;

    @Test
    void shouldEscapeHeadersInHostData() throws Exception {
        when(configProvider.getBaseConfig()).thenReturn(new BaseConfig());
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/fortests/getHostData");
        request.addHeader("X-Evil", "<script>alert(1)</script>");

        String hostData = testee.getHostData(request);

        assertThat(hostData).contains("X-Evil: &lt;script&gt;alert(1)&lt;/script&gt;");
        assertThat(hostData).doesNotContain("<script>");
    }

    @Test
    void shouldRestrictEndpointsToAdmins() throws Exception {
        for (String methodName : new String[]{"getHostData", "testHostSTuff"}) {
            Secured secured = DebugWeb.class.getMethod(methodName, HttpServletRequest.class).getAnnotation(Secured.class);
            assertThat(secured).as(methodName).isNotNull();
            assertThat(secured.value()).containsExactly("ROLE_ADMIN");
        }
    }
}
