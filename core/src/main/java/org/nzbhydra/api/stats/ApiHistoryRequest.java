

package org.nzbhydra.api.stats;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.historystats.stats.HistoryRequest;
import org.nzbhydra.springnative.ReflectionMarker;

@AllArgsConstructor
@NoArgsConstructor
@Data
@ReflectionMarker
public class ApiHistoryRequest {

    private String apikey;
    private HistoryRequest request = new HistoryRequest();
}
