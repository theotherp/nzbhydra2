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

package org.nzbhydra.config;

import org.nzbhydra.config.indexer.IndexerCategoryConfig;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mediainfo.MediaIdType;

import java.util.ArrayList;
import java.util.List;

public final class IndexerConfigBuilder {
    private boolean allCapsChecked;
    private String apiKey = "apikey";
    private Indexer.BackendType backend = Indexer.BackendType.NEWZNAB;
    private IndexerCategoryConfig categoryMapping = new IndexerCategoryConfig();
    private boolean configComplete = true;
    private List<String> enabledCategories = new ArrayList<>();
    private Integer downloadLimit = null;
    private IndexerConfig.State state = IndexerConfig.State.ENABLED;
    private SearchSourceRestriction enabledForSearchSource = SearchSourceRestriction.BOTH;
    private Integer generalMinSize = null;
    private Integer hitLimit = null;
    private Integer hitLimitResetTime = null;
    private String host = "http://127.0.0.1:7070";
    private Integer loadLimitOnRandom = null;
    private String name = "indexer";
    private String password = null;
    private boolean preselect = true;
    private List<String> schedule = new ArrayList<>();
    private Integer score = null;
    private SearchModuleType searchModuleType = SearchModuleType.NEWZNAB;
    private boolean showOnSearch = true;
    private List<MediaIdType> supportedSearchIds = new ArrayList<>();
    private List<ActionAttribute> supportedSearchTypes = new ArrayList<>();
    private Integer timeout = null;
    private String username = null;
    private String userAgent = null;

    private IndexerConfigBuilder() {
    }

    public static IndexerConfigBuilder builder() {
        return new IndexerConfigBuilder();
    }

    public IndexerConfigBuilder allCapsChecked(boolean allCapsChecked) {
        this.allCapsChecked = allCapsChecked;
        return this;
    }

    public IndexerConfigBuilder apiKey(String apiKey) {
        this.apiKey = apiKey;
        return this;
    }

    public IndexerConfigBuilder backend(Indexer.BackendType backend) {
        this.backend = backend;
        return this;
    }

    public IndexerConfigBuilder categoryMapping(IndexerCategoryConfig categoryMapping) {
        this.categoryMapping = categoryMapping;
        return this;
    }

    public IndexerConfigBuilder configComplete(boolean configComplete) {
        this.configComplete = configComplete;
        return this;
    }

    public IndexerConfigBuilder enabledCategories(List<String> enabledCategories) {
        this.enabledCategories = enabledCategories;
        return this;
    }

    public IndexerConfigBuilder downloadLimit(Integer downloadLimit) {
        this.downloadLimit = downloadLimit;
        return this;
    }

    public IndexerConfigBuilder state(IndexerConfig.State state) {
        this.state = state;
        return this;
    }

    public IndexerConfigBuilder enabledForSearchSource(SearchSourceRestriction enabledForSearchSource) {
        this.enabledForSearchSource = enabledForSearchSource;
        return this;
    }

    public IndexerConfigBuilder generalMinSize(Integer generalMinSize) {
        this.generalMinSize = generalMinSize;
        return this;
    }

    public IndexerConfigBuilder hitLimit(Integer hitLimit) {
        this.hitLimit = hitLimit;
        return this;
    }

    public IndexerConfigBuilder hitLimitResetTime(Integer hitLimitResetTime) {
        this.hitLimitResetTime = hitLimitResetTime;
        return this;
    }

    public IndexerConfigBuilder host(String host) {
        this.host = host;
        return this;
    }

    public IndexerConfigBuilder loadLimitOnRandom(Integer loadLimitOnRandom) {
        this.loadLimitOnRandom = loadLimitOnRandom;
        return this;
    }

    public IndexerConfigBuilder name(String name) {
        this.name = name;
        return this;
    }

    public IndexerConfigBuilder password(String password) {
        this.password = password;
        return this;
    }

    public IndexerConfigBuilder preselect(boolean preselect) {
        this.preselect = preselect;
        return this;
    }

    public IndexerConfigBuilder schedule(List<String> schedule) {
        this.schedule = schedule;
        return this;
    }

    public IndexerConfigBuilder score(Integer score) {
        this.score = score;
        return this;
    }

    public IndexerConfigBuilder searchModuleType(SearchModuleType searchModuleType) {
        this.searchModuleType = searchModuleType;
        return this;
    }

    public IndexerConfigBuilder showOnSearch(boolean showOnSearch) {
        this.showOnSearch = showOnSearch;
        return this;
    }

    public IndexerConfigBuilder supportedSearchIds(List<MediaIdType> supportedSearchIds) {
        this.supportedSearchIds = supportedSearchIds;
        return this;
    }

    public IndexerConfigBuilder supportedSearchTypes(List<ActionAttribute> supportedSearchTypes) {
        this.supportedSearchTypes = supportedSearchTypes;
        return this;
    }

    public IndexerConfigBuilder timeout(Integer timeout) {
        this.timeout = timeout;
        return this;
    }

    public IndexerConfigBuilder username(String username) {
        this.username = username;
        return this;
    }

    public IndexerConfigBuilder userAgent(String userAgent) {
        this.userAgent = userAgent;
        return this;
    }

    public IndexerConfig build() {
        IndexerConfig indexerConfig = new IndexerConfig();
        indexerConfig.setAllCapsChecked(allCapsChecked);
        indexerConfig.setApiKey(apiKey);
        indexerConfig.setBackend(backend);
        indexerConfig.setCategoryMapping(categoryMapping);
        indexerConfig.setConfigComplete(configComplete);
        indexerConfig.setEnabledCategories(enabledCategories);
        indexerConfig.setDownloadLimit(downloadLimit);
        indexerConfig.setState(state);
        indexerConfig.setEnabledForSearchSource(enabledForSearchSource);
        indexerConfig.setGeneralMinSize(generalMinSize);
        indexerConfig.setHitLimit(hitLimit);
        indexerConfig.setHitLimitResetTime(hitLimitResetTime);
        indexerConfig.setHost(host);
        indexerConfig.setLoadLimitOnRandom(loadLimitOnRandom);
        indexerConfig.setName(name);
        indexerConfig.setPassword(password);
        indexerConfig.setPreselect(preselect);
        indexerConfig.setSchedule(schedule);
        indexerConfig.setScore(score);
        indexerConfig.setSearchModuleType(searchModuleType);
        indexerConfig.setShowOnSearch(showOnSearch);
        indexerConfig.setSupportedSearchIds(supportedSearchIds);
        indexerConfig.setSupportedSearchTypes(supportedSearchTypes);
        indexerConfig.setTimeout(timeout);
        indexerConfig.setUsername(username);
        indexerConfig.setUserAgent(userAgent);
        return indexerConfig;
    }
}
