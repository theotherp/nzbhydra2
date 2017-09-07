package org.nzbhydra.downloading;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashSet;
import java.util.Set;

@Data
@NoArgsConstructor
public class AddNzbsRequest {

    private String downloaderName;
    private Set<Long> searchResultIds = new HashSet<>();
    private String category = null;

    public AddNzbsRequest(String downloaderName, Set<Long> searchResultIds) {
        this.downloaderName = downloaderName;
        this.searchResultIds = searchResultIds;
    }
}
