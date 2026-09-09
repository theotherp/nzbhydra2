package org.nzbhydra.externalapi.v1;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

/**
 * How many downloads were made of content of the given age in days.
 */
@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "How many downloads were made of content of a given age")
public class ExternalDownloadPerAge {

    @Schema(description = "The age of the content in days", example = "12")
    private Integer age;

    @Schema(description = "How many downloads had that age", example = "4")
    private Integer count;
}
