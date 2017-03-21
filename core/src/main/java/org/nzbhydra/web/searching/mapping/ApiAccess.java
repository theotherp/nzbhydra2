package org.nzbhydra.web.searching.mapping;

import lombok.Data;

@Data
public class ApiAccess {
    private String error;
    private String indexer;
    private String response_successful;
    private Integer response_time;
    private String time;
    private String type;
    private String url; //TODO: Remove or don't use at all because it contains API keys
}
