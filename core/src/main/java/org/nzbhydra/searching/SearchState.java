

package org.nzbhydra.searching;

import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.ArrayList;
import java.util.List;

@Data
@ReflectionMarker
class SearchState {

    private long searchRequestId;
    private boolean indexerSelectionFinished = false;
    private boolean searchFinished = false;
    private int indexersSelected = 0;
    private int indexersFinished = 0;
    private List<SortableMessage> messages = new ArrayList<>();

    public SearchState(long searchRequestId) {
        this.searchRequestId = searchRequestId;
    }

}
