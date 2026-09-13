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

    @Schema(description = "The internal ID of the download", example = "4321")
    private int id;

    @JsonFormat(shape = JsonFormat.Shape.STRING, timezone = "UTC")
    @Schema(description = "When the download was made", example = "2026-09-09T09:59:00Z")
    private Instant time;

    @Schema(description = "The title of the downloaded result", example = "Example.Show.S01E01.1080p.WEB-DL-EXMPL")
    private String title;

    @Schema(description = "The name of the indexer the result came from", example = "Example Indexer")
    private String indexer;

    @Schema(description = "Always null: the download history does not store the category of the search the result came from. Reserved so that it can be filled without a new API version.")
    private String category;

    @Schema(description = "Always null: the download history does not store the size of the result. Reserved so that it can be filled without a new API version.")
    private Long sizeBytes;

    @Schema(description = "The age of the result in days at the time it was downloaded", example = "12")
    private Integer ageDays;

    @Schema(description = "How the file was accessed: REDIRECT (to the indexer) or PROXY (through NZBHydra)", example = "REDIRECT")
    private String accessType;

    @Schema(description = "Where the download came from: INTERNAL (the web interface) or API", example = "API")
    private String accessSource;

    @Schema(description = "The state the download ended in, e.g. NZB_ADDED or CONTENT_DOWNLOAD_SUCCESSFUL", example = "NZB_ADDED")
    private String status;

    @Schema(description = "The error message if the download failed", example = "The indexer did not answer within 10 seconds")
    private String error;

    @Schema(description = "The ID the download client gave the download, if it reported one", example = "SABnzbd_nzo_example")
    private String externalId;

    @Schema(description = "The user who made the download, if users are configured", example = "alice")
    private String username;

    @Schema(description = "The IP the download came from", example = "192.0.2.10")
    private String ip;

    @Schema(description = "The user agent the download was made with", example = "Sonarr/4.0.0 (example)")
    private String userAgent;
}
