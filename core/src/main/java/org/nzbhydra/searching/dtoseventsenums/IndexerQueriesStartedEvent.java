

package org.nzbhydra.searching.dtoseventsenums;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.springnative.ReflectionMarker;

/**
 * Published right before a round of indexer queries is submitted, so that progress listeners can account for
 * every query round of a search (a search may need several rounds, e.g. to page through one indexer), not just
 * the initial indexer selection.
 */
@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
public class IndexerQueriesStartedEvent {

    private SearchRequest searchRequest;
    private int numberOfQueries;

}
