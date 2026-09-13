package org.nzbhydra.web;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.springframework.boot.webmvc.error.ErrorAttributes;
import org.springframework.web.servlet.ModelAndView;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

public class HydraErrorControllerTest {

    @Test
    public void shouldUseModelAttributesSupportedByTheNativeThymeleafContext() throws Exception {
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);
        when(request.getAttribute(RequestDispatcher.FORWARD_REQUEST_URI)).thenReturn("/internalapi/config");
        when(request.getAttribute(RequestDispatcher.FORWARD_QUERY_STRING)).thenReturn("internalApiKey=wrong");
        when(response.getStatus()).thenReturn(401);

        ModelAndView result = new HydraErrorController(mock(ErrorAttributes.class)).handleError(request, response, null,
                new IllegalArgumentException("Unauthorized"));
        String template;
        try (InputStream input = getClass().getResourceAsStream("/templates/error.html")) {
            assertThat(input).isNotNull();
            template = new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }

        assertThat(result.getViewName()).isEqualTo("error");
        assertThat(result.getModel())
                .containsEntry("path", "/internalapi/config")
                .containsEntry("query", "internalApiKey=wrong")
                .containsEntry("status", 401)
                .containsEntry("error", "Unauthorized");
        assertThat(template).doesNotContain("#vars.");
    }
}
