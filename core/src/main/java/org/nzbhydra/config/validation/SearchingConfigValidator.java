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
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.SearchSourceRestriction;
import org.nzbhydra.config.SearchingConfig;
import org.nzbhydra.config.searching.CustomQueryAndTitleMapping;
import org.nzbhydra.searching.CustomQueryAndTitleMappingHandler;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.nzbhydra.config.validation.ConfigValidationTools.checkRegex;

@Component
public class SearchingConfigValidator implements ConfigValidator<SearchingConfig> {

    private static final Logger logger = LoggerFactory.getLogger(SearchingConfigValidator.class);

    @Override
    public boolean doesValidate(Class<?> clazz) {
        return clazz == SearchingConfig.class;
    }

    @Override
    public ConfigValidationResult validateConfig(BaseConfig oldBaseConfig, BaseConfig newBaseConfig, SearchingConfig newConfig) {
        List<String> errors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        checkRegex(errors, newConfig.getRequiredRegex().orElse(null), "The required regex in \"Searching\" is invalid");
        checkRegex(errors, newConfig.getForbiddenRegex().orElse(null), "The forbidden in \"Searching\" is invalid");

        if (newConfig.getApplyRestrictions() == SearchSourceRestriction.NONE) {
            if (!newConfig.getRequiredWords().isEmpty() || !newConfig.getForbiddenWords().isEmpty()) {
                warnings.add("You selected not to apply any word restrictions in \"Searching\" but supplied forbidden or required words there");
            }
            if (newConfig.getRequiredRegex().isPresent() || newConfig.getForbiddenRegex().isPresent()) {
                warnings.add("You selected not to apply any word restrictions in \"Searching\" but supplied a forbidden or required regex there");
            }
        }
        final CustomQueryAndTitleMappingHandler customQueryAndTitleMappingHandler = new CustomQueryAndTitleMappingHandler(newBaseConfig);
        final SearchRequest searchRequest = new SearchRequest();
        searchRequest.setTitle("test title");
        searchRequest.setQuery("test query");
        for (CustomQueryAndTitleMapping customCustomQueryAndTitleMapping : newConfig.getCustomMappings()) {
            try {
                customQueryAndTitleMappingHandler.mapSearchRequest(searchRequest, Collections.singletonList(customCustomQueryAndTitleMapping));
            } catch (Exception e) {
                errors.add(String.format("Unable to process mapping %s:}\n%s", customCustomQueryAndTitleMapping.toString(), e.getMessage()));
            }
            if (customCustomQueryAndTitleMapping.getFrom().contains("{episode:")) {
                errors.add("The group 'episode' is not allowed in custom mapping input patterns.");
            }
            if (customCustomQueryAndTitleMapping.getFrom().contains("{season:")) {
                errors.add("The group 'season' is not allowed in custom mapping input patterns.");
            }
        }
        final List<String> emptyTrailing = (newConfig.getRemoveTrailing().stream().filter(Strings::isNullOrEmpty)).toList();
        if (!emptyTrailing.isEmpty()) {
            errors.add("Trailing values to remove contains empty values");
        }
        for (String quickFilterButton : newConfig.getCustomQuickFilterButtons()) {
            if (quickFilterButton == null) {
                errors.add("Empty quick filter button entry");
                continue;
            }
            if (!quickFilterButton.matches("[^=]+=[^=]+")) {
                errors.add("Quick filter button \"" + quickFilterButton + "\" does not match the format \"DisplayName=Required1,Required2\"");
            }
        }

        return new ConfigValidationResult(errors.isEmpty(), false, errors, warnings);
    }

    @Override
    public SearchingConfig prepareForSaving(BaseConfig oldBaseConfig, SearchingConfig newConfig) {
        final Set<String> customQuickfilterNames = newConfig.getCustomQuickFilterButtons().stream().map(x -> x.split("=")[0]).collect(Collectors.toSet());
        for (Iterator<String> iterator = newConfig.getPreselectQuickFilterButtons().iterator(); iterator.hasNext(); ) {
            String preselectQuickFilterButton = iterator.next();
            final String[] split = preselectQuickFilterButton.split("\\|");
            if ("custom".equals(split[0]) && !customQuickfilterNames.contains(split[0])) {
                logger.info("Custom quickfilter {} doesn't exist anymore, removing it from list of filters to preselect.", preselectQuickFilterButton);
                iterator.remove();
            }
        }
        return newConfig;
    }
}
