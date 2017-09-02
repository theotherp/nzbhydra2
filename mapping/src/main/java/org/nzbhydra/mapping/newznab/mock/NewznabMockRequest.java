package org.nzbhydra.mapping.newznab.mock;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class NewznabMockRequest {

    private int offset;
    private int total;
    private String titleBase;
    private String indexer;
    private int numberOfResults;
    private boolean generateDuplicates;


}
