package org.nzbhydra.externalapi.v1;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.List;

/**
 * How old the downloaded content was. The percentages say how many of all downloads were older than 1000, 2000
 * and 3000 days; {@code averageAge} is in days.
 */
@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "How old the downloaded content was")
public class ExternalDownloadsPerAgeStats {

    @Schema(description = "Percentage of downloads whose content was older than 1000 days", example = "12")
    private Integer percentOlder1000;

    @Schema(description = "Percentage of downloads whose content was older than 2000 days", example = "5")
    private Integer percentOlder2000;

    @Schema(description = "Percentage of downloads whose content was older than 3000 days", example = "1")
    private Integer percentOlder3000;

    @Schema(description = "Average age of the downloaded content in days", example = "420")
    private Integer averageAge;

    @Schema(description = "The number of downloads per age in days")
    private List<ExternalDownloadPerAge> downloadsPerAge;
}
