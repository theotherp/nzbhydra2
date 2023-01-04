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

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Setter
public class IndexerCategoryConfig {

    private Integer anime = null;
    private Integer audiobook = null;
    private Integer comic = null;
    private Integer ebook = null;
    private Integer magazine = null;
    private List<MainCategory> categories = new ArrayList<>();

    @JsonIgnore
    @Setter(AccessLevel.NONE)
    private Map<Integer, String> idsToNames;

    public Optional<Integer> getAnime() {
        return Optional.ofNullable(anime);
    }

    public Optional<Integer> getAudiobook() {
        return Optional.ofNullable(audiobook);
    }

    public Optional<Integer> getComic() {
        return Optional.ofNullable(comic);
    }

    public Optional<Integer> getEbook() {
        return Optional.ofNullable(ebook);
    }

    public Optional<Integer> getMagazine() {
        return Optional.ofNullable(magazine);
    }

    public List<MainCategory> getCategories() {
        return categories;
    }

    public void setCategories(List<MainCategory> categories) {
        this.categories = categories;
        initMap();
    }

    public String getNameFromId(int id) {
        if (idsToNames == null) {
            initMap();
        }
        return idsToNames.getOrDefault(id, "N/A");
    }

    protected void initMap() {
        idsToNames = new HashMap<>();
        for (MainCategory category : categories) {
            for (SubCategory subCategory : category.getSubCategories()) {
                idsToNames.put(subCategory.getId(), category.getName() + " " + subCategory.getName());
            }
            idsToNames.put(category.getId(), category.getName());
        }
    }


    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class MainCategory {
        private int id;
        private String name;
        private List<SubCategory> subCategories = new ArrayList<>();
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class SubCategory {
        private int id;
        private String name;
    }


}
