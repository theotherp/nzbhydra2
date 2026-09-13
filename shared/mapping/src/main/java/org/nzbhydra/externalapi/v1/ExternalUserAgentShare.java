package org.nzbhydra.externalapi.v1;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

/**
 * A user agent's share of all searches or downloads.
 */
@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "A user agent's share of all searches or downloads")
public class ExternalUserAgentShare {

    @Schema(description = "The user agent as sent by the client", example = "Sonarr/4.0.0 (example)")
    private String userAgent;

    @Schema(description = "Number of searches or downloads made with it", example = "34")
    private Integer count;

    @Schema(description = "Percentage of all searches or downloads it accounts for", example = "68.0")
    private float percentage;
}
