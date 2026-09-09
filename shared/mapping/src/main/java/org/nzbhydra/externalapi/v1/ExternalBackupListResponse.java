package org.nzbhydra.externalapi.v1;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.List;

/**
 * Answer of {@code GET /externalapi/v1/backups}. Newest backup first.
 */
@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "The existing backups, newest first")
public class ExternalBackupListResponse {

    @Schema(description = "The backup files in the configured backup folder, newest first")
    private List<ExternalBackupEntry> backups;
}
