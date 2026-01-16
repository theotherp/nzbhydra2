

package org.nzbhydra.downloading.downloaders;

import com.google.common.base.MoreObjects;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

import java.time.Instant;

@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class DownloaderEntry {
    protected String nzbId;
    protected String nzbName;
    protected String status;
    protected Instant time;

    @Override
    public String toString() {
        return MoreObjects.toStringHelper(this)
                .add("nzbId", nzbId)
                .add("nzbName", nzbName)
                .toString();
    }
}
