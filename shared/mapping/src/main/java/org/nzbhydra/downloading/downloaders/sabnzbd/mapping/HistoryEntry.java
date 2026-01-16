

package org.nzbhydra.downloading.downloaders.sabnzbd.mapping;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class HistoryEntry {

    private String nzo_id;
    private String status;
    private String name;
    private Long completed;
    private Long downloaded;


}
