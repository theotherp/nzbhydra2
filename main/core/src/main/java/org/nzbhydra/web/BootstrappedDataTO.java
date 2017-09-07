package org.nzbhydra.web;

import lombok.Data;
import org.nzbhydra.config.safeconfig.SafeConfig;

@Data
public class BootstrappedDataTO {

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
    private SafeConfig safeConfig;

}
