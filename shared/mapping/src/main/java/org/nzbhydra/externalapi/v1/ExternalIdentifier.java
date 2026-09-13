package org.nzbhydra.externalapi.v1;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

/**
 * One identifier a search was made with, e.g. key "IMDB" and value "tt0111161".
 */
@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "One identifier a search was made with")
public class ExternalIdentifier {

    @Schema(description = "The name of a media ID type: IMDB, TMDB, TVDB, TVRAGE, TVMAZE, TVIMDB, TRAKT or TVTITLE", example = "IMDB")
    private String key;

    @Schema(description = "The identifier itself", example = "tt0000000")
    private String value;
}
