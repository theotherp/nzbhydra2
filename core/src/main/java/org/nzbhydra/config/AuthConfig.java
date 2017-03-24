package org.nzbhydra.config;

import lombok.Data;

import java.util.List;

@Data
public class AuthConfig {
    ;

    private AuthType authType;
    private boolean rememberUsers;
    private boolean restrictAdmin;
    private boolean restrictDetailsDl;
    private boolean restrictIndexerSelection;
    private boolean restrictSearch;
    private boolean restrictStats;

    private List<UserAuthConfig> users;

};
