package org.nzbhydra.searching;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.searching.searchrequests.SearchRequest;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class IndexerSearchFinishedEvent {

    private SearchRequest searchRequest;

}
