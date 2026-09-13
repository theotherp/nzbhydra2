package org.nzbhydra.webaccess;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pins the split ADR-0019 introduced: {@link WebAccessException#getMessage()} keeps the full diagnostic form for logs,
 * {@link WebAccessException#getShortMessage()} drops the response body for messages a user reads, and
 * {@link WebAccessException#getBody()} stays available for callers inspecting the body (e.g. the caps check).
 */
class WebAccessExceptionTest {

    @Test
    void shouldKeepBodyInMessageButNotInShortMessage() {
        WebAccessException exception = new WebAccessException("Unauthorized", "{\"error\":\"nope\"}", 401);

        assertThat(exception.getMessage()).isEqualTo("Unauthorized. {\"error\":\"nope\"}. Code: 401");
        assertThat(exception.getShortMessage()).isEqualTo("Unauthorized. Code: 401");
        assertThat(exception.getBody()).isEqualTo("{\"error\":\"nope\"}");
        assertThat(exception.getCode()).isEqualTo(401);
    }

    @Test
    void shouldOmitEmptyResponseMessage() {
        WebAccessException exception = new WebAccessException("", "body", 404);

        assertThat(exception.getMessage()).isEqualTo("body. Code: 404");
        assertThat(exception.getShortMessage()).isEqualTo("Code: 404");
        assertThat(exception.getBody()).isEqualTo("body");
    }

    @Test
    void shouldPreserveCodeZeroSuffixForBodylessException() {
        //The "Code: 0" wart predates ADR-0019 and is preserved, not introduced: the message-only constructor leaves
        //the code at its default and getMessage() has always appended it.
        WebAccessException exception = new WebAccessException("No response available from tool");

        assertThat(exception.getMessage()).isEqualTo("No response available from tool. Code: 0");
        assertThat(exception.getShortMessage()).isEqualTo("No response available from tool. Code: 0");
        assertThat(exception.getBody()).isNull();
    }

    @Test
    void shouldNotLeakAnHtmlErrorPageIntoTheShortMessage() {
        WebAccessException exception = new WebAccessException("Not Found", "<html><body><h1>404 Not Found</h1></body></html>", 404);

        assertThat(exception.getShortMessage()).isEqualTo("Not Found. Code: 404");
        assertThat(exception.getShortMessage()).doesNotContain("<", "\n");
        assertThat(exception.getMessage()).contains("<html>");
    }
}
