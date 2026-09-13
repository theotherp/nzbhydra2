

package org.nzbhydra.config.validation;

import com.google.common.base.Strings;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.SearchSourceRestriction;
import org.nzbhydra.config.SearchingConfig;
import org.nzbhydra.config.searching.AffectedValue;
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
        for (CustomQueryAndTitleMapping customCustomQueryAndTitleMapping : newConfig.getCustomMappings()) {
            final SearchRequest searchRequest = new SearchRequest();
            searchRequest.setTitle("test title");
            searchRequest.setQuery("test query");
            try {
                //Disabled mappings and mappings for result titles are checked as well, using a copy so that the config isn't changed
                final CustomQueryAndTitleMapping mappingToCheck = customCustomQueryAndTitleMapping.copy();
                mappingToCheck.setEnabled(true);
                mappingToCheck.setAffectedValue(AffectedValue.QUERY);
                mappingToCheck.setSearchType(searchRequest.getSearchType());
                customQueryAndTitleMappingHandler.mapSearchRequest(searchRequest, Collections.singletonList(mappingToCheck));
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
        warnAboutDuplicateWholeStringMappings(newConfig.getCustomMappings(), warnings);
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

    /**
     * Mappings are applied top to bottom and no mapping is applied after one which matches the whole string, so a second enabled mapping
     * with the same input pattern would never be used. That's not an error, just very likely a mistake.
     */
    private void warnAboutDuplicateWholeStringMappings(List<CustomQueryAndTitleMapping> mappings, List<String> warnings) {
        for (int i = 0; i < mappings.size(); i++) {
            final CustomQueryAndTitleMapping first = mappings.get(i);
            if (!first.isEnabled() || !first.isMatchAll() || first.getFrom() == null) {
                continue;
            }
            for (int j = i + 1; j < mappings.size(); j++) {
                final CustomQueryAndTitleMapping second = mappings.get(j);
                if (!second.isEnabled() || !second.isMatchAll()) {
                    continue;
                }
                if (first.getFrom().equals(second.getFrom())) {
                    warnings.add(String.format("The custom mappings %s and %s both match the whole string and use the same input pattern \"%s\". Only the former will be applied.",
                            describe(first, i), describe(second, j), first.getFrom()));
                }
            }
        }
    }

    private String describe(CustomQueryAndTitleMapping mapping, int index) {
        final String name = Strings.emptyToNull(Strings.nullToEmpty(mapping.getName()).trim());
        return name == null ? "#" + (index + 1) : "\"" + name + "\" (#" + (index + 1) + ")";
    }

    @Override
    public SearchingConfig prepareForSaving(BaseConfig oldBaseConfig, SearchingConfig newConfig) {
        final Set<String> customQuickfilterNames = newConfig.getCustomQuickFilterButtons().stream().map(x -> x.split("=")[0]).collect(Collectors.toSet());
        for (Iterator<String> iterator = newConfig.getPreselectQuickFilterButtons().iterator(); iterator.hasNext(); ) {
            String preselectQuickFilterButton = iterator.next();
            final String[] split = preselectQuickFilterButton.split("\\|");
            if ("custom".equals(split[0]) && !customQuickfilterNames.contains(split[1])) {
                logger.info("Custom quickfilter {} doesn't exist anymore, removing it from list of filters to preselect.", preselectQuickFilterButton);
                iterator.remove();
            }
        }
        return newConfig;
    }
}
