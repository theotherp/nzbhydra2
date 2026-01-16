

package org.nzbhydra.downloading.downloaders.sabnzbd.mapping;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.ArrayList;
import java.util.List;

@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
public class History {

    private Integer noofslots;
    private Integer ppslots;
    private String day_size;
    private String week_size;
    private String month_size;
    private String total_size;
    private Long last_history_update;
    private List<HistoryEntry> slots = new ArrayList<>();
    private String version;

}
