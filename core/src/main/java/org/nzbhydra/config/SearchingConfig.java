package org.nzbhydra.config;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonFormat.Shape;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.google.common.base.Strings;
import lombok.Data;
import org.nzbhydra.config.downloading.FileDownloadAccessType;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;


@SuppressWarnings("unchecked")
@Data
@ConfigurationProperties
public class SearchingConfig extends ValidatingConfig<SearchingConfig> {

    @JsonFormat(shape = Shape.STRING)
    private SearchSourceRestriction applyRestrictions = SearchSourceRestriction.BOTH;

    private float duplicateAgeThreshold = 2.0F;
    private float duplicateSizeThresholdInPercent = 1.0F;
    private List<String> forbiddenGroups = new ArrayList<>();
    private List<String> forbiddenPosters = new ArrayList<>();
    private String forbiddenRegex;
    private List<String> forbiddenWords = new ArrayList<>();
    private SearchSourceRestriction generateQueries = SearchSourceRestriction.NONE;
    @JsonFormat(shape = Shape.STRING)
    private SearchSourceRestriction idFallbackToQueryGeneration = SearchSourceRestriction.NONE;
    private boolean ignorePassworded = false;
    private boolean ignoreTemporarilyDisabled = false;
    private int keepSearchResultsForDays = 14;
    private Integer keepHistoryForWeeks = null;
    private String language = "en";
    private boolean loadAllCachedOnInternal;
    private Integer maxAge;
    @JsonFormat(shape = Shape.STRING)
    private FileDownloadAccessType nzbAccessType = FileDownloadAccessType.REDIRECT;
    @JsonSetter()
    private List<String> removeTrailing = new ArrayList<>();
    private String requiredRegex;
    private List<String> requiredWords = new ArrayList<>();
    private boolean showQuickFilterButtons = true;
    private Integer timeout = 30;
    private boolean transformNewznabCategories = true;
    private String userAgent = "NZBHydra2";
    private List<String> userAgents = new ArrayList<>(Arrays.asList("Mozilla", "Sonarr", "Radarr", "CouchPotato", "LazyLibrarian", "NZBGet", "sabNZBd"));
    private boolean useOriginalCategories = false;
    private boolean wrapApiErrors = false;

    public SearchingConfig() {
        //removeTrailing = new ArrayList<>(Arrays.asList(".mp4", ".mkv", ".subs", ".REPOST", "repost", "~DG~", ".DG", "-DG", "-1", ".1", "(1)", "ReUp", "ReUp2", "-RP", "-AsRequested", "-Obfuscated", "-Scrambled", "-Chamele0n", "-BUYMORE", "-[TRP]", "-DG", ".par2", ".part01", "part01.rar", ".part02.rar", ".jpg", "[rartv]", "[rarbg]", "[eztv]", "English", "Korean", "Spanish", "French", "German", "Italian", "Danish", "Dutch", "Japanese", "Cantonese", "Mandarin", "Russian", "Polish", "Vietnamese", "Swedish", "Norwegian", "Finnish", "Turkish", "Portuguese", "Flemish", "Greek", "Hungarian"));
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

        if (newBaseConfig.getIndexers().stream().anyMatch(x -> x.getHost().toLowerCase().contains("nzbs.in")) && newConfig.getNzbAccessType() != FileDownloadAccessType.REDIRECT) {
            warnings.add("nzbs.in requires special configurations to be made or your API account will be disabled. You should set the NZB access type in the searching config to \"Redirect to indexer\".");
        }

        return new ConfigValidationResult(errors.isEmpty(), false, errors, warnings);
    }

    @Override
    public SearchingConfig prepareForSaving() {
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