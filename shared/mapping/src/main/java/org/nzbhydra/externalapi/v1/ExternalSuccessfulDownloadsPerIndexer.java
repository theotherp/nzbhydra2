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

    @Schema(description = "The name of the indexer")
    private String indexerName;

    @Schema(description = "Number of downloads from this indexer")
    private Integer countAll;

    @Schema(description = "Number of downloads that succeeded")
    private Integer countSuccessful;

    @Schema(description = "Number of downloads that failed")
    private Integer countError;

    @Schema(description = "Percentage of downloads that succeeded")
    private Float percentSuccessful;
}
