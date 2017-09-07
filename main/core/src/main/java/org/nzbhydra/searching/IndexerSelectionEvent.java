package org.nzbhydra.searching;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.nzbhydra.searching.searchrequests.SearchRequest;

@Data
@AllArgsConstructor
public class IndexerSelectionEvent {

    private SearchRequest searchRequest;
    private int indexersSelected;

}
