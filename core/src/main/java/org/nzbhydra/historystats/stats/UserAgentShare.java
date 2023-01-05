package org.nzbhydra.historystats.stats;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
public class UserAgentShare {
    private String userAgent = null;
    private int count;
    private float percentage;

    public UserAgentShare(String userAgent, int count) {
        this.userAgent = userAgent;
        this.count = count;
    }
}
