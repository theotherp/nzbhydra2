/*
 *  (C) Copyright 2023 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.config.validation;

import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.auth.UserAuthConfig;
import org.springframework.stereotype.Component;

@Component
public class UserAuthConfigValidator implements ConfigValidator<UserAuthConfig> {

    @Override
    public boolean doesValidate(Class<?> clazz) {
        return clazz == UserAuthConfig.class;
    }

    @Override
    public ConfigValidationResult validateConfig(BaseConfig oldBaseConfig, BaseConfig newBaseConfig, UserAuthConfig newConfig) {
        return new ConfigValidationResult();
    }

    @Override
    public UserAuthConfig prepareForSaving(BaseConfig oldBaseConfig, UserAuthConfig newConfig) {
        if (newConfig.getPassword() != null && !newConfig.getPassword().startsWith(UserAuthConfig.PASSWORD_ID)) {
            newConfig.setPassword(UserAuthConfig.PASSWORD_ID + newConfig.getPassword());
        }
        return newConfig;
    }

    @Override
    public UserAuthConfig updateAfterLoading(UserAuthConfig newConfig) {
        if (newConfig.getPassword() != null && newConfig.getPassword().startsWith(UserAuthConfig.PASSWORD_ID)) {
            newConfig.setPassword(newConfig.getPassword().substring(6));
        }
        return newConfig;
    }
}
