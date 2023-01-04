package org.nzbhydra.config;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonFormat.Shape;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.google.common.base.Strings;
import lombok.Data;
import org.nzbhydra.indexers.QueryGenerator;
import org.nzbhydra.searching.CustomQueryAndTitleMapping;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;


@SuppressWarnings("unchecked")
@Data
@ConfigurationProperties(prefix = "searching")
public class SearchingConfig {

    private static final Logger logger = LoggerFactory.getLogger(SearchingConfig.class);

    @JsonFormat(shape = Shape.STRING)
    private SearchSourceRestriction applyRestrictions = SearchSourceRestriction.BOTH;
    private int coverSize = 128;
    private List<CustomQueryAndTitleMapping.Mapping> customMappings = new ArrayList<>();
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
    private boolean replaceUmlauts = false;
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
    private List<String> userAgents = new ArrayList<>(Arrays.asList("Mozilla", "Sonarr", "Radarr", "CouchPotato", "LazyLibrarian", "Lidarr", "Mylar", "NZBGet", "sabNZBd", "Readarr", "NZB360"));
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


}
