package org.nzbhydra.indexers;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.springnative.ReflectionMarker;

import java.io.Serializable;

@Data
@ReflectionMarker
@AllArgsConstructor
public class DetailsResult implements Serializable {

    private boolean successful;
    private SearchResultItem searchResultItem;
    private String errorMessage;


    public static DetailsResult unsuccessful(String error) {
        return new DetailsResult(false, null, error);
    }

    public static DetailsResult withItem(SearchResultItem item) {
        return new DetailsResult(true, item, null);
    }


}
