package org.nzbhydra.searching;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.nzbhydra.searching.searchrequests.SearchRequest;

@Data
@AllArgsConstructor
public class FallbackSearchInitiatedEvent {

    private SearchRequest searchRequest;

}
