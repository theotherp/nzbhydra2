package org.nzbhydra.externalapi.v1;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

/**
 * How much unique content an indexer contributed compared to the others.
 */
@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "How much unique content an indexer contributed compared to the others")
public class ExternalIndexerScore {

    @Schema(description = "The name of the indexer", example = "Example Indexer")
    private String indexerName;

    @Schema(description = "Average uniqueness score over the involved searches", example = "62")
    private Integer averageUniquenessScore;

    @Schema(description = "Number of searches this indexer took part in", example = "120")
    private long involvedSearches;

    @Schema(description = "Downloads of results only this indexer provided", example = "8")
    private long uniqueDownloads;

    @Schema(description = "Downloads of results this indexer provided, exclusive or not", example = "34")
    private long providedDownloads;

    @Schema(description = "Percentage of downloaded results this indexer also had", example = "71")
    private Integer coveragePercent;

    @Schema(description = "Percentage of downloaded results only this indexer had", example = "23")
    private Integer exclusivePercent;

    @Schema(description = "Contribution to results that several indexers provided", example = "12.5")
    private Double sharedContribution;

    @Schema(description = "Shared contribution as a percentage", example = "25")
    private Integer sharedContributionPercent;

    @Schema(description = "Observations recorded before the corrected scoring was introduced", example = "40")
    private long legacyObservations;

    @Schema(description = "Observations recorded with the corrected scoring", example = "80")
    private long correctedObservations;
}
