/*
 *  (C) Copyright 2017 TheOtherP (theotherp@posteo.net)
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
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.javers.core.metamodel.annotation.DiffIgnore;
import org.nzbhydra.config.RestartRequired;
import org.nzbhydra.config.sensitive.SensitiveData;
import org.nzbhydra.springnative.ReflectionMarker;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;

@Data
@ReflectionMarker
@ConfigurationProperties(prefix = "auth")
@EqualsAndHashCode
public class AuthConfig {

    @JsonFormat(shape = Shape.STRING)
    @RestartRequired
    private AuthType authType;
    private boolean rememberUsers = true;
    private int rememberMeValidityDays;
    @SensitiveData
    private String authHeader;
    private List<String> authHeaderIpRanges = new ArrayList<>();
    private boolean restrictAdmin = false;
    private boolean restrictDetailsDl = false;
    private boolean restrictIndexerSelection = false;
    private boolean restrictSearch = false;
    private boolean restrictStats = false;
    private boolean allowApiStats = true;

    @DiffIgnore
    private List<UserAuthConfig> users = new ArrayList<>();

    @JsonIgnore
    public boolean isAuthConfigured() {
        return authType != AuthType.NONE;
    }


}
