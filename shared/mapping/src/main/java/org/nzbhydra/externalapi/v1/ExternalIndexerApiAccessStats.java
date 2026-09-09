package org.nzbhydra.externalapi.v1;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

/**
 * How often an indexer was called and how well those calls went.
 */
@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "How often an indexer was called and how well those calls went")
public class ExternalIndexerApiAccessStats {

    @Schema(description = "The name of the indexer")
    private String indexerName;

    @Schema(description = "Percentage of calls that succeeded")
    private Double percentSuccessful;

    @Schema(description = "Percentage of calls that failed to connect")
    private Double percentConnectionError;

    @Schema(description = "Average number of calls per day in the time range")
    private Double averageAccessesPerDay;
}
