/*
 *  (C) Copyright 2017 TheOtherP (theotherp@gmx.de)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.nzbhydra.config.auth;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonFormat.Shape;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.google.common.base.Joiner;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.RestartRequired;
import org.nzbhydra.config.ValidatingConfig;
import org.nzbhydra.config.sensitive.SensitiveData;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Data
@ConfigurationProperties
@EqualsAndHashCode
public class AuthConfig extends ValidatingConfig<AuthConfig> {

    @JsonFormat(shape = Shape.STRING)
    @RestartRequired
    private AuthType authType;
    private boolean rememberUsers = true;
    private int rememberMeValidityDays;
    @SensitiveData
    private String authHeader;
    private List<String> authHeaderIpRanges;
    private boolean restrictAdmin = false;
    private boolean restrictDetailsDl = false;
    private boolean restrictIndexerSelection = false;
    private boolean restrictSearch = false;
    private boolean restrictStats = false;
    private boolean allowApiStats = true;

    private List<UserAuthConfig> users = new ArrayList<>();

    @JsonIgnore
    public boolean isAuthConfigured() {
        return authType != AuthType.NONE;
    }

    @Override
    public ConfigValidationResult validateConfig(BaseConfig oldConfig, AuthConfig newConfig, BaseConfig newBaseConfig) {
        List<String> errors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        if (authType != AuthType.NONE && users.isEmpty()) {
            errors.add("You've enabled security but not defined any users");
        } else if (authType != AuthType.NONE && restrictAdmin && users.stream().noneMatch(UserAuthConfig::isMaySeeAdmin)) {
            errors.add("You've restricted admin access but no user has admin rights");
        } else if (authType != AuthType.NONE && !restrictSearch && !restrictAdmin) {
            errors.add("You haven't enabled any access restrictions. Auth will not take any effect");
        }
        Set<String> usernames = new HashSet<>();
        List<String> duplicateUsernames = new ArrayList<>();
        for (UserAuthConfig user : users) {
            if (usernames.contains(user.getUsername())) {
                duplicateUsernames.add(user.getUsername());
            }
            usernames.add(user.getUsername());
        }
        if (!duplicateUsernames.isEmpty()) {
            errors.add("The following user names are not unique: " + Joiner.on(", ").join(duplicateUsernames));
        }

        if (!authHeaderIpRanges.isEmpty()) {
            authHeaderIpRanges.forEach(x -> {
                Matcher matcher = Pattern.compile("^((?:[0-9]{1,3}\\.){3}[0-9]{1,3}(-(?:[0-9]{1,3}\\.){3}[0-9]{1,3})?,?)+$").matcher(x);
                if (!matcher.matches()) {
                    errors.add("IP range " + x + " is invalid");
                }
            });
        }

        return new ConfigValidationResult(errors.isEmpty(), isRestartNeeded(oldConfig.getAuth()), errors, warnings);
    }

    @Override
    public AuthConfig prepareForSaving() {
        getUsers().forEach(ValidatingConfig::prepareForSaving);
        return this;
    }

    @Override
    public AuthConfig updateAfterLoading() {
        getUsers().forEach(ValidatingConfig::updateAfterLoading);
        return this;
    }

    @Override
    public AuthConfig initializeNewConfig() {
        return this;
    }
}
