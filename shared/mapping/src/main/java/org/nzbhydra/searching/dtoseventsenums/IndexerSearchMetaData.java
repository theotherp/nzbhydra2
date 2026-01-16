

package org.nzbhydra.searching.dtoseventsenums;

import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

@Data
@ReflectionMarker
public class IndexerSearchMetaData {

    private boolean didSearch;
    private String errorMessage;
    private boolean hasMoreResults;
    private String indexerName;
    private String notPickedReason;
    private int numberOfAvailableResults;
    private int numberOfFoundResults;
    private int offset;
    private long responseTime;
    private boolean totalResultsKnown;
    private boolean wasSuccessful;

}
