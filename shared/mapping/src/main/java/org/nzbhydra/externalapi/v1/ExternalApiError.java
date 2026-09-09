package org.nzbhydra.externalapi.v1;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

import java.time.Instant;

/**
 * The body of every error answer of the external API except the 404 of a missing or wrong API key, which has no
 * body at all so that it cannot be told apart from an unknown path.
 */
@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "The body of every error answer except the bodyless 404 of a missing or wrong API key")
public class ExternalApiError {

    @Schema(description = "The HTTP status code, repeated here so a client that only reads the body has it", example = "400")
    private int status;

    @Schema(description = "INVALID_PARAMETER (400), NOT_FOUND (404), STATS_TIMEOUT (503) or INTERNAL_ERROR (500)", example = "INVALID_PARAMETER")
    private String code;

    @Schema(description = "A human readable explanation. Not a stable contract; use the code.", example = "limit must be between 1 and 500 but was 501")
    private String message;

    @JsonFormat(shape = JsonFormat.Shape.STRING, timezone = "UTC")
    @Schema(description = "When the error was produced", example = "2026-09-09T10:00:00Z")
    private Instant timestamp;
}
