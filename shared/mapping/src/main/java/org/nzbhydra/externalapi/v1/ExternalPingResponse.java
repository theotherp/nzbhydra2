package org.nzbhydra.externalapi.v1;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

import java.time.Instant;

/**
 * Answer of {@code GET /externalapi/v1/ping}: proof that the key was accepted and that the instance is up.
 */
@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Proof that the API key was accepted and that the instance is up")
public class ExternalPingResponse {

    @Schema(description = "The running NZBHydra2 version, e.g. 8.9.1", example = "9.0.0")
    private String version;

    @JsonFormat(shape = JsonFormat.Shape.STRING, timezone = "UTC")
    @Schema(description = "The instance's current time", example = "2026-09-09T10:00:00Z")
    private Instant serverTime;
}
