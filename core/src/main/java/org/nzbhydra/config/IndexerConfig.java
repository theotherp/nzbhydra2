package org.nzbhydra.config;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonFormat.Shape;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.google.common.base.Objects;
import com.google.common.base.Strings;
import lombok.Data;
import org.nzbhydra.config.sensitive.SensitiveData;
import org.nzbhydra.indexers.Indexer.BackendType;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mediainfo.InfoProvider.IdType;
import org.nzbhydra.searching.IndexerForSearchSelector;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;

@Data
@ConfigurationProperties(prefix = "indexers")
public class IndexerConfig extends ValidatingConfig {

    public enum State {
        ENABLED,
        DISABLED_SYSTEM_TEMPORARY,
        DISABLED_SYSTEM,
        DISABLED_USER
    }

    private boolean allCapsChecked;
    @SensitiveData
    private String apiKey;
    @JsonFormat(shape = Shape.STRING)
    private BackendType backend = BackendType.NEWZNAB;
    private IndexerCategoryConfig categoryMapping = new IndexerCategoryConfig();
    private boolean configComplete = true;
    private List<String> enabledCategories = new ArrayList<>();
    private Integer downloadLimit = null;
    @JsonFormat(shape = Shape.STRING)
    private State state = State.ENABLED;
    @JsonFormat(shape = Shape.STRING)
    private SearchSourceRestriction enabledForSearchSource = SearchSourceRestriction.BOTH;
    private Integer generalMinSize = null;
    private Integer hitLimit = null;
    private Integer hitLimitResetTime = null;
    private String host;
    @SensitiveData //May contain API key in called URL
    private String lastError;
    private Long disabledUntil = null;
    private int disabledLevel;
    private Integer loadLimitOnRandom = null;
    private String name;
    @SensitiveData
    private String password = null;
    private boolean preselect = true;
    private List<String> schedule = new ArrayList<>();
    private Integer score = null;
    private SearchModuleType searchModuleType = SearchModuleType.NEWZNAB;
    private boolean showOnSearch = true;
    @JsonFormat(shape = Shape.STRING)
    private List<IdType> supportedSearchIds = new ArrayList<>();
    private List<ActionAttribute> supportedSearchTypes = new ArrayList<>();
    private Integer timeout = null;
    @SensitiveData
    private String username = null;
    private String userAgent = null;

    public Optional<Integer> getHitLimit() {
        return Optional.ofNullable(hitLimit);
    }

    public Optional<Integer> getDownloadLimit() {
        return Optional.ofNullable(downloadLimit);
    }

    public Optional<Integer> getHitLimitResetTime() {
        return Optional.ofNullable(hitLimitResetTime);
    }

    public Optional<Integer> getLoadLimitOnRandom() {
        return Optional.ofNullable(loadLimitOnRandom);
    }

    public Optional<Integer> getGeneralMinSize() {
        return Optional.ofNullable(generalMinSize);
    }

    public Optional<String> getPassword() {
        return Optional.ofNullable(Strings.emptyToNull(password));
    }

    public Optional<Integer> getScore() {
        return Optional.ofNullable(score);
    }

    public Optional<Integer> getTimeout() {
        return Optional.ofNullable(timeout);
    }

    public Optional<String> getUsername() {
        return Optional.ofNullable(Strings.emptyToNull(username));
    }

    public Optional<String> getUserAgent() {
        return Optional.ofNullable(Strings.emptyToNull(userAgent));
    }

    public void setState(State state) {
        this.state = state;
    }

    public void setDisabledUntil(Long disabledUntil) {
        this.disabledUntil = disabledUntil;
        //When the config is written from YAML or from the web the setters are called in any order
        if (state == State.ENABLED || state == State.DISABLED_USER) {
            this.disabledUntil = null;
        }
    }

    public void setDisabledLevel(int disabledLevel) {
        this.disabledLevel = disabledLevel;
        //When the config is written from YAML or from the web the setters are called in any order
        if (state == State.ENABLED || state == State.DISABLED_USER) {
            this.disabledLevel = 0;
        }
    }

    public void setLastError(String lastError) {
        this.lastError = lastError;
        //When the config is written from YAML or from the web the setters are called in any order
        if (state == State.ENABLED || state == State.DISABLED_USER) {
            this.lastError = null;
        }
    }

    @JsonIgnore
    public boolean isEligibleForInternalSearch(boolean isIgnoreTemporarilyDisabled) {
        return showOnSearch
                && configComplete
                && (
                state == State.ENABLED
                        || (state == State.DISABLED_SYSTEM_TEMPORARY
                        && (
                        isIgnoreTemporarilyDisabled || disabledUntil == null || Instant.ofEpochMilli(disabledUntil).isBefore(Instant.now())
                )));
    }

    @Override
    public ConfigValidationResult validateConfig(BaseConfig oldConfig) {
        ConfigValidationResult validationResult = new ConfigValidationResult();
        for (IndexerConfig config : oldConfig.getIndexers()) {
            for (String schedule : config.getSchedule()) {
                Matcher matcher = IndexerForSearchSelector.SCHEDULER_PATTERN.matcher(schedule);
                if (!matcher.matches()) {
                    validationResult.getErrorMessages().add("Indexer " + config.getName() + " contains an invalid schedule: " + schedule);
                }
            }
            if (config.getHitLimit().isPresent() && config.getHitLimit().get() <= 0) {
                validationResult.getErrorMessages().add("Indexer " + config.getName() + " has a hit limit of 0 or lower which doesn't make sense: ");
            }
            if (config.getDownloadLimit().isPresent() && config.getDownloadLimit().get() <= 0) {
                validationResult.getErrorMessages().add("Indexer " + config.getName() + " has a download limit of 0 or lower which doesn't make sense: ");
            }
        }

        return validationResult;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        if (!super.equals(o)) {
            return false;
        }
        IndexerConfig that = (IndexerConfig) o;
        return Objects.equal(host, that.host) &&
                Objects.equal(name, that.name);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(super.hashCode(), host, name);
    }
}
