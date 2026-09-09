package org.nzbhydra.externalapi.v1;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

/**
 * A count per day of the week. The day is the short English name, e.g. "Mon".
 */
@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "A count per day of the week")
public class ExternalCountPerDayOfWeek {

    @Schema(description = "The short English day name: Mon, Tue, Wed, Thu, Fri, Sat or Sun")
    private String day;

    @Schema(description = "How many events fell on that day")
    private Integer count;
}
