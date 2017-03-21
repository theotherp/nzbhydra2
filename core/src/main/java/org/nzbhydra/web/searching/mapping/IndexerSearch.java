package org.nzbhydra.web.searching.mapping;

import lombok.Data;

import java.util.List;

@Data
public class IndexerSearch {

    private List<ApiAccess> apiAccesses;
    private boolean did_search;
    private boolean has_more;
    private String indexer;
    private Integer offset;
    private boolean successful;
    private String time;
    private Integer total;
    private boolean total_known;

}
