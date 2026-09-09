package org.nzbhydra.externalapi.v1;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

import java.time.Instant;

/**
 * One entry of {@code GET /externalapi/v1/history/downloads}.
 *
 * <p>{@code accessType}, {@code accessSource} and {@code status} are the names of the internal enums as strings, which
 * stay stable even if the enum classes are moved or renamed.
 */
@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "One download from the download history")
public class ExternalDownloadHistoryEntry {

    @Schema(description = "The internal ID of the download")
    private int id;

    @JsonFormat(shape = JsonFormat.Shape.STRING, timezone = "UTC")
    @Schema(description = "When the download was made")
    private Instant time;

    @Schema(description = "The title of the downloaded result")
    private String title;

    @Schema(description = "The name of the indexer the result came from")
    private String indexer;

    @Schema(description = "Always null: the download history does not store the category of the search the result came from. Reserved so that it can be filled without a new API version.")
    private String category;

    @Schema(description = "Always null: the download history does not store the size of the result. Reserved so that it can be filled without a new API version.")
    private Long sizeBytes;

    @Schema(description = "The age of the result in days at the time it was downloaded")
    private Integer ageDays;

    @Schema(description = "How the file was accessed: REDIRECT or PROXY")
    private String accessType;

    @Schema(description = "Where the download came from: INTERNAL (the web interface) or API")
    private String accessSource;

    @Schema(description = "The state the download ended in, e.g. NZB_ADDED or CONTENT_DOWNLOAD_SUCCESSFUL")
    private String status;

    @Schema(description = "The error message if the download failed")
    private String error;

    @Schema(description = "The ID the download client gave the download, if it reported one")
    private String externalId;

    @Schema(description = "The user who made the download, if users are configured")
    private String username;

    @Schema(description = "The IP the download came from")
    private String ip;

    @Schema(description = "The user agent the download was made with")
    private String userAgent;
}
