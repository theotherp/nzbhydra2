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

import com.google.common.base.Strings;
import org.apache.commons.lang3.StringUtils;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.searching.IndexerForSearchSelector;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;
import java.util.regex.Matcher;

@Component
public class IndexerConfigValidator implements ConfigValidator<IndexerConfig> {
    @Override
    public boolean doesValidate(Class<?> clazz) {
        return clazz == IndexerConfig.class;
    }

    @Override
    public ConfigValidationResult validateConfig(BaseConfig oldBaseConfig, BaseConfig newBaseConfig, IndexerConfig newConfig) {
        ConfigValidationResult validationResult = new ConfigValidationResult();

        for (String schedule : newConfig.getSchedule()) {
            Matcher matcher = IndexerForSearchSelector.SCHEDULER_PATTERN.matcher(schedule);
            if (!matcher.matches()) {
                validationResult.getErrorMessages().add("Indexer " + newConfig.getName() + " contains an invalid schedule: " + schedule);
            }
        }
        if (newConfig.getHitLimit().isPresent() && newConfig.getHitLimit().get() <= 0) {
            validationResult.getErrorMessages().add("Indexer " + newConfig.getName() + " has a hit limit of 0 or lower which doesn't make sense: ");
        }
        if (newConfig.getDownloadLimit().isPresent() && newConfig.getDownloadLimit().get() <= 0) {
            validationResult.getErrorMessages().add("Indexer " + newConfig.getName() + " has a download limit of 0 or lower which doesn't make sense: ");
        }
        final String newExpirationDate = newConfig.getVipExpirationDate();
        if (newExpirationDate != null && !newExpirationDate.equals("Lifetime")) {
            try {
                DateTimeFormatter.ofPattern("yyyy-MM-dd").parse(newExpirationDate);
            } catch (Exception e) {
                validationResult.getErrorMessages().add("Invalid expiry date for indexer " + newConfig.getName() + ". Either use 'Lifetime' or use the format `YYYY-MM-DD");
            }
        }

        newConfig.getCustomParameters().forEach(x -> {
            if (Strings.isNullOrEmpty(x) || StringUtils.countMatches(x, '=') > 1) {
                validationResult.getErrorMessages().add("The custom paramater " + x + " is invalid. You must use the format name=value.");
            }
        });

        newConfig.getAttributeWhitelist().forEach(x -> {
            if (Strings.isNullOrEmpty(x) || StringUtils.countMatches(x, '=') != 1) {
                validationResult.getErrorMessages().add("The attribute whitelist entry '" + x + "' is invalid. You must use the format name=value or name=value1,value2.");
            }
        });

        return validationResult;
    }

    @Override
    public IndexerConfig prepareForSaving(BaseConfig oldBaseConfig, IndexerConfig newConfig) {
        if (newConfig.getState() == IndexerConfig.State.ENABLED || newConfig.getState() == IndexerConfig.State.DISABLED_USER) {
            newConfig.setDisabledUntil(null);
            newConfig.setDisabledLevel(0);
            newConfig.setLastError(null);
        }
        return newConfig;
    }
}
