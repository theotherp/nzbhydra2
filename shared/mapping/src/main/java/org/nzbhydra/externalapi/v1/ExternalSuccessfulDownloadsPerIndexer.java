package org.nzbhydra.externalapi.v1;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

/**
 * How many downloads from an indexer succeeded and how many failed.
 */
@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "How many downloads from an indexer succeeded and how many failed")
public class ExternalSuccessfulDownloadsPerIndexer {

    @Schema(description = "The name of the indexer", example = "Example Indexer")
    private String indexerName;

    @Schema(description = "Number of downloads from this indexer", example = "34")
    private Integer countAll;

    @Schema(description = "Number of downloads that succeeded", example = "33")
    private Integer countSuccessful;

    @Schema(description = "Number of downloads that failed", example = "1")
    private Integer countError;

    @Schema(description = "Percentage of downloads that succeeded", example = "97.1")
    private Float percentSuccessful;
}
