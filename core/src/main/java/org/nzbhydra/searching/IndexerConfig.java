package org.nzbhydra.searching;

import lombok.Data;
import lombok.ToString;

@Data
@ToString
public class IndexerConfig {

    private String name;
    private String host;
    private String apikey;
    private String searchModuleType;

}
