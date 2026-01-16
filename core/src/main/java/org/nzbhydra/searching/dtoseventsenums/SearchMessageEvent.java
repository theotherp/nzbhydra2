

package org.nzbhydra.searching.dtoseventsenums;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.searching.SortableMessage;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.springnative.ReflectionMarker;

@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
public class SearchMessageEvent {

    private SearchRequest searchRequest;
    private SortableMessage message;

    public SearchMessageEvent(SearchRequest searchRequest, String message) {
        this.searchRequest = searchRequest;
        this.message = new SortableMessage(message, message);
    }

    public SearchMessageEvent(SearchRequest searchRequest, String message, String messageSortValue) {
        this.searchRequest = searchRequest;
        this.message = new SortableMessage(message, messageSortValue);
    }

}
