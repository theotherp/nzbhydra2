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

package org.nzbhydra.config.indexer;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonFormat.Shape;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.google.common.base.Objects;
import com.google.common.base.Strings;
import lombok.Data;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.SearchSourceRestriction;
import org.nzbhydra.config.ValidatingConfig;
import org.nzbhydra.config.sensitive.SensitiveData;
import org.nzbhydra.indexers.Indexer.BackendType;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mapping.newznab.json.JsonPubdateDeserializer;
import org.nzbhydra.mapping.newznab.json.JsonPubdateSerializer;
import org.nzbhydra.mediainfo.MediaIdType;
import org.nzbhydra.searching.IndexerForSearchSelector;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;

@Data
@ConfigurationProperties(prefix = "indexers")
public class IndexerConfig extends ValidatingConfig<IndexerConfig> {

    public enum State {
        ENABLED,
        DISABLED_SYSTEM_TEMPORARY,
        DISABLED_SYSTEM,
        DISABLED_USER;

        public String humanize() {
            switch (this) {
                case ENABLED:
                    return "Enabled";
                case DISABLED_SYSTEM_TEMPORARY:
                    return "Disabled temporarily";
                case DISABLED_SYSTEM:
                    return "Disabled permanently";
                case DISABLED_USER:
                    return "Disabled by user";
            }
            return "Unknown";
        }
    }

    private boolean allCapsChecked;
    @SensitiveData
    private String apiKey;
    @JsonFormat(shape = Shape.STRING)
    private BackendType backend = BackendType.NEWZNAB;
    private IndexerCategoryConfig categoryMapping = new IndexerCategoryConfig();
    private String color;
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
    @JsonDeserialize(using = JsonPubdateDeserializer.class)
    @JsonSerialize(using = JsonPubdateSerializer.class)
    private Instant disabledAt;
    private Integer loadLimitOnRandom = null;
    private Integer minSeeders;
    private String name;
    @SensitiveData
    private String password = null;
    private boolean preselect = true;
    private List<String> schedule = new ArrayList<>();
    private int score;
    private SearchModuleType searchModuleType = SearchModuleType.NEWZNAB;
    private boolean showOnSearch = true;
    @JsonFormat(shape = Shape.STRING)
    private List<MediaIdType> supportedSearchIds = new ArrayList<>();
    private List<ActionAttribute> supportedSearchTypes = new ArrayList<>();
    private Integer timeout = null;
    @SensitiveData
    private String username = null;
    private String userAgent = null;
    private String vipExpirationDate;

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

    public Optional<Integer> getTimeout() {
        return Optional.ofNullable(timeout);
    }

    public Optional<String> getUsername() {
        return Optional.ofNullable(Strings.emptyToNull(username));
    }

    public Optional<String> getUserAgent() {
        return Optional.ofNullable(Strings.emptyToNull(userAgent));
    }

    public void setVipExpirationDate(String vipExpirationDate) {
        this.vipExpirationDate = Strings.emptyToNull(vipExpirationDate);
    }

    @JsonIgnore
    public boolean isEligibleForInternalSearch() {
        return showOnSearch
                && configComplete
                && (
                state == State.ENABLED
                        || (state == State.DISABLED_SYSTEM_TEMPORARY
                        && (disabledUntil == null || Instant.ofEpochMilli(disabledUntil).isBefore(Instant.now())
                )));
    }

    @Override
    public ConfigValidationResult validateConfig(BaseConfig oldConfig, IndexerConfig newIndexerConfig, BaseConfig newBaseConfig) {
        ConfigValidationResult validationResult = new ConfigValidationResult();

        for (String schedule : getSchedule()) {
            Matcher matcher = IndexerForSearchSelector.SCHEDULER_PATTERN.matcher(schedule);
            if (!matcher.matches()) {
                validationResult.getErrorMessages().add("Indexer " + getName() + " contains an invalid schedule: " + schedule);
            }
        }
        if (newIndexerConfig.getHitLimit().isPresent() && newIndexerConfig.getHitLimit().get() <= 0) {
            validationResult.getErrorMessages().add("Indexer " + getName() + " has a hit limit of 0 or lower which doesn't make sense: ");
        }
        if (newIndexerConfig.getDownloadLimit().isPresent() && newIndexerConfig.getDownloadLimit().get() <= 0) {
            validationResult.getErrorMessages().add("Indexer " + getName() + " has a download limit of 0 or lower which doesn't make sense: ");
        }
        final String newExpirationDate = newIndexerConfig.getVipExpirationDate();
        if (newExpirationDate != null && !newExpirationDate.equals("Lifetime")) {
            try {
                DateTimeFormatter.ofPattern("yyyy-MM-dd").parse(newExpirationDate);
            } catch (Exception e) {
                validationResult.getErrorMessages().add("Invalid expiry date for indexer " + newIndexerConfig.getName() + ". Either use 'Lifetime' or use the format `YYYY-MM-DD");
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
        IndexerConfig that = (IndexerConfig) o;
        return Objects.equal(host, that.host) &&
                Objects.equal(name, that.name);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(super.hashCode(), host, name);
    }

    @Override
    public IndexerConfig prepareForSaving(BaseConfig oldBaseConfig) {
        if (state == State.ENABLED || state == State.DISABLED_USER) {
            this.disabledUntil = null;
            this.disabledLevel = 0;
            this.lastError = null;
        }
        return this;
    }

    @Override
    public IndexerConfig updateAfterLoading() {
        return this;
    }

    @Override
    public IndexerConfig initializeNewConfig() {
        return this;
    }

    public static boolean isIndexerEquals(IndexerConfig a, IndexerConfig b) {
        return java.util.Objects.equals(b.getHost(), a.getHost())
                && java.util.Objects.equals(b.getApiKey(), a.getApiKey())
                && java.util.Objects.equals(a.getSearchModuleType(), b.getSearchModuleType()) //Animetosho (and others) may support newznab and torznab and may be added once for each type
                ;
    }
}
