

package org.nzbhydra.indexers.torbox.mapping;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

@Data
@ReflectionMarker
@JsonIgnoreProperties(ignoreUnknown = true)
public class TorboxSearchResponse {

    private boolean success;
    private String message;
    private TorboxSearchResultsContainer data = new TorboxSearchResultsContainer();
}
