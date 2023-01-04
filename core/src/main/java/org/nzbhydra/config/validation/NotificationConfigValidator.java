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

import joptsimple.internal.Strings;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.NotificationConfig;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class NotificationConfigValidator implements ConfigValidator<NotificationConfig> {
    @Override
    public boolean doesValidate(Class<?> clazz) {
        return clazz == NotificationConfig.class;
    }

    @Override
    public ConfigValidationResult validateConfig(BaseConfig oldBaseConfig, BaseConfig newBaseConfig, NotificationConfig newConfig) {
        final List<String> errors = new ArrayList<>();
        final List<String> warnings = new ArrayList<>();
        if (newConfig.getEntries().stream()
            .anyMatch(x -> Strings.isNullOrEmpty(x.getAppriseUrls()))) {
            errors.add("Make sure all notification entries contain a URL");
        }

        final boolean appriseUrlSet = !Strings.isNullOrEmpty(newConfig.getAppriseApiUrl());
        final boolean anyEntries = newConfig.getEntries().isEmpty();

        if (anyEntries && !appriseUrlSet) {
            warnings.add("No notifications will be sent unless the Apprise API URL is configured.");
        }

        return new ConfigValidationResult(true, false, errors, warnings);
    }
}
