package org.nzbhydra.web.mapping.stats;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class StatsRequest {

    private Instant after = Instant.now().minus(30, ChronoUnit.DAYS);
    private Instant before = Instant.now();

}
