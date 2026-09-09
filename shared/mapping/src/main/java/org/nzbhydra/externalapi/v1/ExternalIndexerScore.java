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

    @Schema(description = "The name of the indexer")
    private String indexerName;

    @Schema(description = "Average uniqueness score over the involved searches")
    private Integer averageUniquenessScore;

    @Schema(description = "Number of searches this indexer took part in")
    private long involvedSearches;

    @Schema(description = "Downloads of results only this indexer provided")
    private long uniqueDownloads;

    @Schema(description = "Downloads of results this indexer provided, exclusive or not")
    private long providedDownloads;

    @Schema(description = "Percentage of downloaded results this indexer also had")
    private Integer coveragePercent;

    @Schema(description = "Percentage of downloaded results only this indexer had")
    private Integer exclusivePercent;

    @Schema(description = "Contribution to results that several indexers provided")
    private Double sharedContribution;

    @Schema(description = "Shared contribution as a percentage")
    private Integer sharedContributionPercent;

    @Schema(description = "Observations recorded before the corrected scoring was introduced")
    private long legacyObservations;

    @Schema(description = "Observations recorded with the corrected scoring")
    private long correctedObservations;
}
