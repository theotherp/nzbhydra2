package org.nzbhydra.externalapi.v1;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

import java.time.Instant;

/**
 * One backup ZIP in the configured backup folder.
 */
@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "One backup ZIP in the configured backup folder")
public class ExternalBackupEntry {

    @Schema(description = "The file name, e.g. nzbhydra-2026-09-09-12-00-00.zip. Pass it to GET /externalapi/v1/backups/{filename} to download the file.")
    private String filename;

    @JsonFormat(shape = JsonFormat.Shape.STRING, timezone = "UTC")
    @Schema(description = "When the file was created, as reported by the file system")
    private Instant createdAt;

    @Schema(description = "The file's size in bytes")
    private long sizeBytes;
}
