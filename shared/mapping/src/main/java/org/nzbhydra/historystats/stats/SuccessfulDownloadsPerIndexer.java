package org.nzbhydra.historystats.stats;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
public class SuccessfulDownloadsPerIndexer {
    private String indexerName;
    private Integer countAll;
    private Integer countSuccessful;
    private Integer countError;
    private Float percentSuccessful;
}
