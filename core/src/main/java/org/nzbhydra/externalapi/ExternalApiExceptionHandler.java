package org.nzbhydra.externalapi;

import jakarta.validation.ConstraintViolationException;
import org.nzbhydra.externalapi.v1.ExternalApiError;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.time.Instant;

/**
 * Turns everything the external API can fail with into an {@link ExternalApiError}. It is bound to
 * {@link ExternalApiV1Controller} alone, so {@link org.nzbhydra.web.ErrorHandler} keeps handling every other
 * controller exactly as before.
 */
@RestControllerAdvice(assignableTypes = ExternalApiV1Controller.class)
public class ExternalApiExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(ExternalApiExceptionHandler.class);

    public static final String CODE_INVALID_PARAMETER = "INVALID_PARAMETER";
    public static final String CODE_NOT_FOUND = "NOT_FOUND";
    public static final String CODE_STATS_TIMEOUT = "STATS_TIMEOUT";
    public static final String CODE_INTERNAL_ERROR = "INTERNAL_ERROR";
    /**
     * The 500 body never quotes the exception: an external caller must not learn file names, SQL or stack frames from
     * a failure. The full stack trace goes to the log instead.
     */
    static final String INTERNAL_ERROR_MESSAGE = "Internal error, see the log";

    @ExceptionHandler({IllegalArgumentException.class, MethodArgumentTypeMismatchException.class,
            ConstraintViolationException.class, MethodArgumentNotValidException.class,
            MissingServletRequestParameterException.class})
    public ResponseEntity<ExternalApiError> handleInvalidParameter(Exception e) {
        logger.debug("Rejecting external API request with invalid parameters: {}", e.getMessage());
        return error(HttpStatus.BAD_REQUEST, CODE_INVALID_PARAMETER, e.getMessage());
    }

    @ExceptionHandler(ExternalBackupNotFoundException.class)
    public ResponseEntity<ExternalApiError> handleNotFound(ExternalBackupNotFoundException e) {
        logger.debug("Rejecting external API request for unknown backup: {}", e.getMessage());
        return error(HttpStatus.NOT_FOUND, CODE_NOT_FOUND, e.getMessage());
    }

    /**
     * {@code Stats.getAllStats} throws this when it aborts a calculation that ran into its own timeout.
     */
    @ExceptionHandler(InterruptedException.class)
    public ResponseEntity<ExternalApiError> handleStatsTimeout(InterruptedException e) {
        Thread.currentThread().interrupt();
        logger.warn("Stats calculation for the external API was aborted", e);
        return error(HttpStatus.SERVICE_UNAVAILABLE, CODE_STATS_TIMEOUT,
                "The stats calculation took too long and was aborted");
    }

    /**
     * Spring Security's own exception translation turns these into the configured 401 or 403 and, for the external
     * API, into nothing a caller should be able to tell from an unknown path. Catching them here would turn them into
     * a 500 instead, so they are handed back to the filter chain untouched.
     */
    @ExceptionHandler({AccessDeniedException.class, AuthenticationException.class})
    public ResponseEntity<ExternalApiError> rethrowSecurityException(RuntimeException e) {
        throw e;
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ExternalApiError> handleAnythingElse(Exception e) {
        logger.error("Unexpected error while handling an external API request", e);
        return error(HttpStatus.INTERNAL_SERVER_ERROR, CODE_INTERNAL_ERROR, INTERNAL_ERROR_MESSAGE);
    }

    private ResponseEntity<ExternalApiError> error(HttpStatus status, String code, String message) {
        return ResponseEntity.status(status)
                .contentType(MediaType.APPLICATION_JSON)
                .body(new ExternalApiError(status.value(), code, message, Instant.now()));
    }
}
