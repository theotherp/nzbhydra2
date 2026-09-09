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

    @Schema(description = "The HTTP status code, repeated here so a client that only reads the body has it")
    private int status;

    @Schema(description = "INVALID_PARAMETER (400), NOT_FOUND (404), STATS_TIMEOUT (503) or INTERNAL_ERROR (500)")
    private String code;

    @Schema(description = "A human readable explanation. Not a stable contract; use the code.")
    private String message;

    @JsonFormat(shape = JsonFormat.Shape.STRING, timezone = "UTC")
    @Schema(description = "When the error was produced")
    private Instant timestamp;
}
