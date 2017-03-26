package org.nzbhydra.web.mapping;

import lombok.Data;

@Data
public class IndexerSearchMetaData {

    private boolean didSearch;
    private String errorMessage;
    private boolean hasMoreResults;
    private String indexerName;
    private int limit;
    private String notPickedReason;
    private int numberOfAvailableResults;
    private int numberOfResults;
    private int offset;
    private long responseTime;
    private boolean totalResultsKnown;
    private boolean wasSuccessful;

}
