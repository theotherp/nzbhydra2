package org.nzbhydra.config;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonFormat.Shape;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.google.common.base.Strings;
import lombok.Data;
import org.nzbhydra.indexers.QueryGenerator;
import org.nzbhydra.searching.CustomSearchRequestMapping;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;


@SuppressWarnings("unchecked")
@Data
@ConfigurationProperties
public class SearchingConfig extends ValidatingConfig<SearchingConfig> {

    private static final Logger logger = LoggerFactory.getLogger(SearchingConfig.class);

    @JsonFormat(shape = Shape.STRING)
    private SearchSourceRestriction applyRestrictions = SearchSourceRestriction.BOTH;
    private int coverSize = 128;
    private List<CustomSearchRequestMapping.Mapping> customMappings = new ArrayList<>();
    private Integer globalCacheTimeMinutes;
    private float duplicateAgeThreshold = 2.0F;
    private float duplicateSizeThresholdInPercent = 1.0F;
    private List<String> forbiddenGroups = new ArrayList<>();
    private List<String> forbiddenPosters = new ArrayList<>();
    private String forbiddenRegex;
    private List<String> forbiddenWords = new ArrayList<>();
    private SearchSourceRestriction alwaysConvertIds = SearchSourceRestriction.NONE;
    private SearchSourceRestriction generateQueries = SearchSourceRestriction.INTERNAL;

    private QueryGenerator.QueryFormat generateQueriesFormat = QueryGenerator.QueryFormat.TITLE;
    @JsonFormat(shape = Shape.STRING)
    private SearchSourceRestriction idFallbackToQueryGeneration = SearchSourceRestriction.NONE;
    private boolean ignorePassworded = false;
    private boolean ignoreTemporarilyDisabled = false;
    private boolean ignoreLoadLimitingForInternalSearches = false;
    private int keepSearchResultsForDays = 3;
    private String language = "en";
    private List<String> languagesToKeep = new ArrayList<>();
    private boolean loadAllCachedOnInternal;
    private int loadLimitInternal = 100;
    private Integer maxAge;
    private Integer minSeeders;
    @JsonSetter()
    private List<String> removeTrailing = new ArrayList<>();
    private String requiredRegex;
    private List<String> requiredWords = new ArrayList<>();
    private boolean sendTorznabCategories = true;
    private boolean showQuickFilterButtons = true;
    private boolean alwaysShowQuickFilterButtons = false;
    private List<String> customQuickFilterButtons = new ArrayList<>();
    private List<String> preselectQuickFilterButtons = new ArrayList<>();
    private Integer timeout = 30;
    private boolean transformNewznabCategories = true;
    private String userAgent = "NZBHydra2";
    private List<String> userAgents = new ArrayList<>(Arrays.asList("Mozilla", "Sonarr", "Radarr", "CouchPotato", "LazyLibrarian", "Lidarr", "NZBGet", "sabNZBd", "Readarr"));
    private boolean useOriginalCategories = false;
    private boolean wrapApiErrors = false;

    public SearchingConfig() {
    }

    public Optional<Integer> getGlobalCacheTimeMinutes() {
        return Optional.ofNullable(globalCacheTimeMinutes);
    }

    public Optional<Integer> getMaxAge() {
        return Optional.ofNullable(maxAge);
    }

    public Optional<String> getForbiddenRegex() {
        return Optional.ofNullable(Strings.emptyToNull(forbiddenRegex));
    }

    public Optional<String> getRequiredRegex() {
        return Optional.ofNullable(Strings.emptyToNull(requiredRegex));
    }

    public Optional<String> getUserAgent() {
        return Optional.ofNullable(Strings.emptyToNull(userAgent));
    }

    public Optional<String> getLanguage() {
        return Optional.ofNullable(Strings.emptyToNull(language));
    }


    @Override
    public ConfigValidationResult validateConfig(BaseConfig oldConfig, SearchingConfig newConfig, BaseConfig newBaseConfig) {
        List<String> errors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        checkRegex(errors, requiredRegex, "The required regex in \"Searching\" is invalid");
        checkRegex(errors, forbiddenRegex, "The forbidden in \"Searching\" is invalid");

        if (applyRestrictions == SearchSourceRestriction.NONE) {
            if (!getRequiredWords().isEmpty() || !getForbiddenWords().isEmpty()) {
                warnings.add("You selected not to apply any word restrictions in \"Searching\" but supplied forbidden or required words there");
            }
            if (getRequiredRegex().isPresent() || getForbiddenRegex().isPresent()) {
                warnings.add("You selected not to apply any word restrictions in \"Searching\" but supplied a forbidden or required regex there");
            }
        }
        final CustomSearchRequestMapping customSearchRequestMapping = new CustomSearchRequestMapping();
        final SearchRequest searchRequest = new SearchRequest();
        searchRequest.setTitle("test title");
        searchRequest.setQuery("test query");
        for (CustomSearchRequestMapping.Mapping customMapping : newConfig.getCustomMappings()) {
            try {
                customSearchRequestMapping.mapSearchRequest(searchRequest, Collections.singletonList(customMapping));
            } catch (Exception e) {
                errors.add(String.format("Unable to process mapping %s:}\n%s", customMapping.toString(), e.getMessage()));
            }
            if (customMapping.getFrom().contains("{episode:")) {
                errors.add("The group 'episode' is not allowed in custom mapping input patterns.");
            }
            if (customMapping.getFrom().contains("{season:")) {
                errors.add("The group 'season' is not allowed in custom mapping input patterns.");
            }
        }

        return new ConfigValidationResult(errors.isEmpty(), false, errors, warnings);
    }

    @Override
    public SearchingConfig prepareForSaving(BaseConfig oldBaseConfig) {
        final Set<String> customQuickfilterNames = customQuickFilterButtons.stream().map(x -> x.split("=")[0]).collect(Collectors.toSet());
        for (Iterator<String> iterator = getPreselectQuickFilterButtons().iterator(); iterator.hasNext(); ) {
            String preselectQuickFilterButton = iterator.next();
            final String[] split = preselectQuickFilterButton.split("\\|");
            if ("custom".equals(split[0]) && !customQuickfilterNames.contains(split[0])) {
                logger.info("Custom quickfilter {} doesn't exist anymore, removing it from list of filters to preselect.", preselectQuickFilterButton);
                iterator.remove();
            }
        }
        return this;
    }

    @Override
    public SearchingConfig updateAfterLoading() {
        return this;
    }

    @Override
    public SearchingConfig initializeNewConfig() {
        return this;
    }

}
