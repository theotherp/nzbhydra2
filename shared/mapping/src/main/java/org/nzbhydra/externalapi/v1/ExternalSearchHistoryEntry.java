package org.nzbhydra.externalapi.v1;

import com.fasterxml.jackson.annotation.JsonFormat;
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

    @Schema(description = "The internal ID of the search")
    private int id;

    @JsonFormat(shape = JsonFormat.Shape.STRING, timezone = "UTC")
    @Schema(description = "When the search was made")
    private Instant time;

    @Schema(description = "Where the search came from: INTERNAL (the web interface) or API")
    private String source;

    @Schema(description = "The kind of search: SEARCH, TVSEARCH, MOVIE, BOOK or MUSIC")
    private String searchType;

    @Schema(description = "The name of the category that was searched in")
    private String category;

    @Schema(description = "The search query")
    private String query;

    @Schema(description = "The title that was searched for, if the search was made by title")
    private String title;

    @Schema(description = "The author that was searched for, for book searches")
    private String author;

    @Schema(description = "The season that was searched for, for TV searches")
    private Integer season;

    @Schema(description = "The episode that was searched for, for TV searches")
    private String episode;

    @Schema(description = "Minimum age of the results in days, if one was requested")
    private Integer minAge;

    @Schema(description = "Maximum age of the results in days, if one was requested")
    private Integer maxAge;

    @Schema(description = "Minimum size of the results in megabytes, if one was requested")
    private Integer minSize;

    @Schema(description = "Maximum size of the results in megabytes, if one was requested")
    private Integer maxSize;

    @Schema(description = "The identifiers the search was made with, e.g. an IMDB ID")
    private List<ExternalIdentifier> identifiers;

    @Schema(description = "The names of the indexers that were searched, sorted alphabetically")
    private List<String> selectedIndexers;

    @Schema(description = "The user who made the search, if users are configured")
    private String username;

    @Schema(description = "The IP the search came from")
    private String ip;

    @Schema(description = "The user agent the search was made with")
    private String userAgent;
}
