

package org.nzbhydra.downloading.downloaders.sabnzbd.mapping;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.ArrayList;
import java.util.List;

@Data
@ReflectionMarker
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class Queue {

    private String status;
    private Boolean paused;
    private String kbpersec;
    private String mbleft;
    private String timeleft;
    private List<QueueEntry> slots = new ArrayList<>();

}
