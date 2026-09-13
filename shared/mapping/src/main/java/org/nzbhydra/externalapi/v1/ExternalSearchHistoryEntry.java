package org.nzbhydra.externalapi.v1;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

import java.time.Instant;
import java.util.List;

/**
 * One entry of {@code GET /externalapi/v1/history/searches}.
 *
 * <p>{@code source} and {@code searchType} are the names of the internal enums as strings, which stay stable even if
 * the enum classes are moved or renamed.
 */
@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "One search from the search history")
public class ExternalSearchHistoryEntry {

    @Schema(description = "The internal ID of the search", example = "1234")
    private int id;

    @JsonFormat(shape = JsonFormat.Shape.STRING, timezone = "UTC")
    @Schema(description = "When the search was made", example = "2026-09-09T09:58:00Z")
    private Instant time;

    @Schema(description = "Where the search came from: INTERNAL (the web interface) or API", example = "API")
    private String source;

    @Schema(description = "The kind of search: SEARCH, TVSEARCH, MOVIE, BOOK or MUSIC", example = "TVSEARCH")
    private String searchType;

    @Schema(description = "The name of the category that was searched in", example = "TV HD")
    private String category;

    @Schema(description = "The search query", example = "example show")
    private String query;

    @Schema(description = "The title that was searched for, if the search was made by title", example = "Example Show")
    private String title;

    @Schema(description = "The author that was searched for, for book searches", example = "Ex Ample")
    private String author;

    @Schema(description = "The season that was searched for, for TV searches", example = "1")
    private Integer season;

    @Schema(description = "The episode that was searched for, for TV searches", example = "1")
    private String episode;

    @Schema(description = "Minimum age of the results in days, if one was requested", example = "0")
    private Integer minAge;

    @Schema(description = "Maximum age of the results in days, if one was requested", example = "1500")
    private Integer maxAge;

    @Schema(description = "Minimum size of the results in megabytes, if one was requested", example = "100")
    private Integer minSize;

    @Schema(description = "Maximum size of the results in megabytes, if one was requested", example = "20000")
    private Integer maxSize;

    @Schema(description = "The identifiers the search was made with, e.g. an IMDB ID")
    private List<ExternalIdentifier> identifiers;

    @ArraySchema(arraySchema = @Schema(description = "The names of the indexers that were searched, sorted alphabetically"),
            schema = @Schema(example = "Example Indexer"))
    private List<String> selectedIndexers;

    @Schema(description = "The user who made the search, if users are configured", example = "alice")
    private String username;

    @Schema(description = "The IP the search came from", example = "192.0.2.10")
    private String ip;

    @Schema(description = "The user agent the search was made with", example = "Sonarr/4.0.0 (example)")
    private String userAgent;
}
