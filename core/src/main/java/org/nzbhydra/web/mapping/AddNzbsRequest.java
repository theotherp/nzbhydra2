package org.nzbhydra.web.mapping;

import lombok.Data;

import java.util.HashSet;
import java.util.Set;

@Data
public class AddNzbsRequest {

    private String downloaderName;
    private Set<Long> searchResultIds = new HashSet<>();
    private String category = null;

}
