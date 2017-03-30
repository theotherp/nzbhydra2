package org.nzbhydra.web.mapping.stats;

import lombok.Data;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Data
public class StatsRequest {

    private Instant after = Instant.now().minus(30, ChronoUnit.DAYS);
    private Instant before = Instant.now();

}
