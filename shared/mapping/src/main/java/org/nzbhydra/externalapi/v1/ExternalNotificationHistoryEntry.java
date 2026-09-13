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
 * One entry of {@code GET /externalapi/v1/history/notifications}.
 *
 * <p>{@code eventType} and {@code messageType} are the names of the internal enums as strings, which stay stable even
 * if the enum classes are moved or renamed.
 */
@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "One notification from the notification history")
public class ExternalNotificationHistoryEntry {

    @Schema(description = "The internal ID of the notification", example = "77")
    private int id;

    @JsonFormat(shape = JsonFormat.Shape.STRING, timezone = "UTC")
    @Schema(description = "When the notification was created", example = "2026-09-09T09:59:01Z")
    private Instant time;

    @Schema(description = "What happened, e.g. RESULT_DOWNLOAD or INDEXER_DISABLED", example = "RESULT_DOWNLOAD")
    private String eventType;

    @Schema(description = "How the notification was shown: INFO, SUCCESS, WARNING or FAILURE", example = "INFO")
    private String messageType;

    @Schema(description = "The title of the notification", example = "Result downloaded")
    private String title;

    @Schema(description = "The body of the notification", example = "Example.Show.S01E01.1080p.WEB-DL-EXMPL was downloaded from Example Indexer")
    private String body;

    @ArraySchema(arraySchema = @Schema(description = "The Apprise URLs the notification was sent to, split on commas and line breaks"),
            schema = @Schema(example = "json://notify.example/hooks/example"))
    private List<String> urls;

    @Schema(description = "Whether the notification was displayed in the web interface", example = "true")
    private boolean displayed;
}
