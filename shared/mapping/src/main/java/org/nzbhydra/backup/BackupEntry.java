

package org.nzbhydra.backup;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

import java.time.Instant;

@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
public class BackupEntry {
    private String filename;
    private Instant creationDate;
}
