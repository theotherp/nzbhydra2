package org.nzbhydra.web;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.bind.MissingServletRequestParameterException;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

public class ErrorHandlerTest {

    private final ErrorHandler testee = new ErrorHandler();

    private MockHttpServletRequest request(String accept) {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/internalapi/autocomplete/MOVIE");
        request.addParameter("x", "<script>alert(1)</script>");
        request.addHeader("Accept", accept);
        return request;
    }

    @Test
    public void shouldReturnPlainTextWithoutParametersOrStackTraceForHtmlRequests() {
        ResponseEntity<Object> response = testee.handleConflict(
                new MissingServletRequestParameterException("q", "String"), request("text/html"));

        assertThat(response.getHeaders().getContentType().toString()).isEqualTo("text/plain;charset=UTF-8");
        String body = (String) response.getBody();
        assertThat(body).doesNotContain("<script>").doesNotContain("alert(1)").doesNotContain("\tat ")
                .contains("/internalapi/autocomplete/MOVIE");
        assertThat(response.getStatusCode().value()).isEqualTo(400);
    }

    @Test
    public void shouldNotLeakParametersOrStackTraceInJsonResponse() {
        ResponseEntity<Object> response = testee.handleConflict(
                new MissingServletRequestParameterException("q", "String"), request("application/json"));

        ErrorHandler.JsonExceptionResponse body = (ErrorHandler.JsonExceptionResponse) response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getException()).isNull();
        assertThat(body.getParameters()).isNull();
        assertThat(body.getPath()).isEqualTo("/internalapi/autocomplete/MOVIE");
        assertThat(body.getStatus()).isEqualTo(400);
    }

    @Test
    public void shouldReturnPlainTextWithoutStackTraceInFallback() {
        MockHttpServletRequest request = new MockHttpServletRequest() {
            @Override
            public String getRequestURI() {
                throw new IllegalStateException("boom");
            }
        };

        ResponseEntity<Object> response = testee.handleConflict(new IOException("io"), request);

        assertThat(response.getHeaders().getContentType()).isEqualTo(new MediaType("text", "plain", StandardCharsets.UTF_8));
        assertThat((String) response.getBody()).doesNotContain("\tat ").doesNotContain("IOException");
    }
}
