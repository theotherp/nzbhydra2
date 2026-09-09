package org.nzbhydra.externalapi.v1;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

/**
 * An indexer's share of all downloads in the requested time range.
 */
@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "An indexer's share of all downloads in the time range")
public class ExternalIndexerDownloadShare {

    @Schema(description = "The name of the indexer", example = "Example Indexer")
    private String indexerName;

    @Schema(description = "Number of downloads from this indexer", example = "34")
    private long total;

    @Schema(description = "Percentage of all downloads that came from this indexer", example = "68.0")
    private float share;
}
