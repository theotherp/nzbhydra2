package org.nzbhydra.externalapi.v1;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

/**
 * A count per hour of the day (0 to 23).
 */
@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "A count per hour of the day")
public class ExternalCountPerHourOfDay {

    @Schema(description = "The hour of the day, 0 to 23", example = "21")
    private Integer hour;

    @Schema(description = "How many events fell in that hour", example = "9")
    private Integer count;
}
