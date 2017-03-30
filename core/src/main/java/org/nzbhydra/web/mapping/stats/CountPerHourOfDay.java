package org.nzbhydra.web.mapping.stats;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class CountPerHourOfDay {
    private Integer hour = null;
    private Integer count = null;
}
