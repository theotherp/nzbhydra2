package org.nzbhydra.web.mapping;

import lombok.Data;

@Data
public class BootstrappedData {

    private String username;
    private String authType;
    private Boolean maySeeSearch;
    private Boolean adminRestricted;
    private Boolean statsRestricted;
    private Boolean maySeeStats;
    private Boolean searchRestricted;
    private Boolean maySeeDetailsDl;
    private Boolean maySeeAdmin;
    private Boolean authConfigured;
    private Boolean showIndexerSelection;
    private String baseUrl;
    private SafeConfig safeConfig;

}
