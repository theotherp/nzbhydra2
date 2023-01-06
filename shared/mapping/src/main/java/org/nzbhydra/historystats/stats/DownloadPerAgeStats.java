package org.nzbhydra.historystats.stats;

import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.List;

@Data
@ReflectionMarker
public class DownloadPerAgeStats {
    private Integer percentOlder1000 = null;
    private Integer percentOlder2000 = null;
    private Integer percentOlder3000 = null;
    private Integer averageAge = null;
    List<DownloadPerAge> downloadsPerAge;

}
