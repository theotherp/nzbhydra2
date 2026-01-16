

package org.nzbhydra.webaccess;

import lombok.Getter;
import org.apache.logging.log4j.util.Strings;

import java.io.IOException;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class WebAccessException extends IOException {

    private final String message;
    @Getter
    private String body;
    @Getter
    private int code;

    public WebAccessException(Exception e) {
        super(e);
        this.message = e.getMessage();
    }

    public WebAccessException(String errorMessage) {
        super(errorMessage);
        this.message = errorMessage;
    }

    public WebAccessException(String responseMessage, String body, int code) {
        this.message = responseMessage;
        this.body = body;
        this.code = code;
    }

    public String getMessage() {
        return Stream.of(Strings.isNotEmpty(message) ? message : "",
                        Strings.isNotEmpty(body) ? body : "",
                        "Code: " + code)
                .filter(Strings::isNotEmpty)
                .collect(Collectors.joining(". "));
    }


}
