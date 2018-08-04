package org.nzbhydra.historystats.stats;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class DownloadOrSearchSharePerUserOrIp {
    private String key = null;
    private int count;
    private float percentage;
}
