

package org.nzbhydra.downloading.downloaders.sabnzbd.mapping;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

@Data
@ReflectionMarker
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class QueueEntry {

    private String status;
    private String nzo_id;
    private String filename;
    private String timeleft;
    private String percentage;
    private String mbleft;


}
