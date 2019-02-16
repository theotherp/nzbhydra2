/*
 *  (C) Copyright 2017 TheOtherP (theotherp@gmx.de)
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
import org.nzbhydra.indexers.IndexerRepository;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mapping.newznab.json.InstantEpochDeserializer;
import org.nzbhydra.mapping.newznab.json.InstantEpochSerializer;
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
public class IndexerConfig extends ValidatingConfig<IndexerConfig> {

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
    private SearchSourceRestriction enabledForSearchSource = SearchSourceRestriction.BOTH;
    private Integer generalMinSize = null;
    private Integer hitLimit = null;
    private Integer hitLimitResetTime = null;
    private String host;
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


    //The following are stored in the config for the web and migration but the source of truth is the database
    @JsonFormat(shape = Shape.STRING)
    private IndexerState state;
    private String lastError;
    @JsonDeserialize(using = InstantEpochDeserializer.class)
    @JsonSerialize(using = InstantEpochSerializer.class)
    private Instant disabledUntil;
    private int disabledLevel;

    @JsonIgnore
    public boolean isEligibleForInternalSearch() {
        return showOnSearch
                && configComplete
                && (
                state == IndexerState.ENABLED
                        || (state == IndexerState.DISABLED_SYSTEM_TEMPORARY
                        && (disabledUntil == null || disabledUntil.isBefore(Instant.now())
                )));
    }

    @JsonIgnore
    private static IndexerRepository indexerRepository;

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



    @Override
    public ConfigValidationResult validateConfig(BaseConfig oldConfig, IndexerConfig newIndexerConfig) {
        ConfigValidationResult validationResult = new ConfigValidationResult();

        for (String schedule : getSchedule()) {
            Matcher matcher = IndexerForSearchSelector.SCHEDULER_PATTERN.matcher(schedule);
            if (!matcher.matches()) {
                validationResult.getErrorMessages().add("Indexer " + getName() + " contains an invalid schedule: " + schedule);
            }
        }
        if (getHitLimit().isPresent() && getHitLimit().get() <= 0) {
            validationResult.getErrorMessages().add("Indexer " + getName() + " has a hit limit of 0 or lower which doesn't make sense: ");
        }
        if (getDownloadLimit().isPresent() && getDownloadLimit().get() <= 0) {
            validationResult.getErrorMessages().add("Indexer " + getName() + " has a download limit of 0 or lower which doesn't make sense: ");
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

    public static void setIndexerRepository(IndexerRepository indexerRepository) {
        IndexerConfig.indexerRepository = indexerRepository;
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(super.hashCode(), host, name);
    }

    @Override
    public IndexerConfig prepareForSaving() {
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

}
