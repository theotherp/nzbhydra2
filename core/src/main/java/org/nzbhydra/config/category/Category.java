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

package org.nzbhydra.config.category;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.google.common.base.Strings;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.config.SearchSourceRestriction;
import org.nzbhydra.searching.dtoseventsenums.SearchType;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@SuppressWarnings("unchecked")
@ConfigurationProperties(prefix = "categories")
@Data
@NoArgsConstructor
public class Category {

    public enum Subtype {
        NONE,
        ALL,
        ANIME,
        AUDIOBOOK,
        COMIC,
        EBOOK,
        MAGAZINE
    }

    /**
     * Internal name
     */
    protected String name;
    protected boolean mayBeSelected = true;
    protected SearchType searchType;

    @JsonDeserialize(using = NewznabCategoriesDeserializer.class)
    @JsonSerialize(using = NewznabCategoriesSerializer.class)
    protected List<List<Integer>> newznabCategories = new ArrayList<>();

    protected SearchSourceRestriction ignoreResultsFrom;

    protected SearchSourceRestriction applyRestrictionsType;
    protected String forbiddenRegex;
    protected List<String> forbiddenWords = new ArrayList<>();
    protected String requiredRegex;
    protected List<String> requiredWords = new ArrayList<>();

    protected Integer maxSizePreset;
    protected Integer minSizePreset;
    protected boolean applySizeLimitsToApi;
    private String description;
    private boolean preselect;
    private Subtype subtype = Subtype.NONE;

    public Category(String name) {
        this.name = name;
    }




    public Optional<String> getForbiddenRegex() {
        return Optional.ofNullable(Strings.emptyToNull(forbiddenRegex));
    }

    public Optional<String> getRequiredRegex() {
        return Optional.ofNullable(Strings.emptyToNull(requiredRegex));
    }

    public Optional<Integer> getMaxSizePreset() {
        return Optional.ofNullable(maxSizePreset);
    }

    public Optional<Integer> getMinSizePreset() {
        return Optional.ofNullable(minSizePreset);
    }

    public boolean deepEquals(Category other) {
        return mayBeSelected == other.mayBeSelected &&
                searchType == other.searchType &&
                com.google.common.base.Objects.equal(name, other.name) &&
                com.google.common.base.Objects.equal(newznabCategories, other.newznabCategories) &&
                applyRestrictionsType == other.applyRestrictionsType &&
                ignoreResultsFrom == other.ignoreResultsFrom &&
                com.google.common.base.Objects.equal(forbiddenWords, other.forbiddenWords) &&
                com.google.common.base.Objects.equal(forbiddenRegex, other.forbiddenRegex) &&
                com.google.common.base.Objects.equal(requiredWords, other.requiredWords) &&
                com.google.common.base.Objects.equal(maxSizePreset, other.maxSizePreset) &&
                com.google.common.base.Objects.equal(minSizePreset, other.minSizePreset) &&
                com.google.common.base.Objects.equal(preselect, other.preselect) &&
                com.google.common.base.Objects.equal(requiredRegex, other.requiredRegex);
    }


    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        Category category = (Category) o;
        return Objects.equals(name, category.name);
    }


    @Override
    public int hashCode() {
        return Objects.hash(name);
    }

}
