

package org.nzbhydra.news;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
public class NewsEntryForWeb {
    private String version;
    private String news;
    private boolean forCurrentVersion;
    private boolean forNewerVersion;
}
