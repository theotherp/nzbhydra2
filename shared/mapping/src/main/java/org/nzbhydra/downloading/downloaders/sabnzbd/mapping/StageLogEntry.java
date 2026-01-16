

package org.nzbhydra.downloading.downloaders.sabnzbd.mapping;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.List;

@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
public class StageLogEntry {

    private String name;
    private List<String> actions = null;

}
