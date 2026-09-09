package org.nzbhydra.externalapi.v1;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

/**
 * An indexer's average response time in milliseconds and its delta to the average of all indexers.
 */
@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "An indexer's average response time and how it compares to the others")
public class ExternalAverageResponseTime {

    @Schema(description = "The name of the indexer", example = "Example Indexer")
    private String indexer;

    @Schema(description = "Average response time in milliseconds", example = "812.5")
    private double avgResponseTime;

    @Schema(description = "Difference in milliseconds to the average of all indexers", example = "-137.5")
    private double delta;
}
