package org.nzbhydra;

import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

import java.time.Instant;

@Data
@ReflectionMarker
public class ExceptionInfo {
    private long timestamp;
    private int status;
    private String error;
    private String exception;
    private String message;
    private String path;

    public ExceptionInfo(int status, String error, String exception, String message, String path) {
        this.timestamp = Instant.now().getEpochSecond();
        this.status = status;
        this.error = error;
        this.exception = exception;
        this.message = message;
        this.path = path;
    }
}
