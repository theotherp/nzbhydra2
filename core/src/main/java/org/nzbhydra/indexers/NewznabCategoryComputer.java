/*
 *  (C) Copyright 2025 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.indexers;

import lombok.extern.slf4j.Slf4j;
import org.nzbhydra.config.category.Category;
import org.nzbhydra.config.indexer.IndexerCategoryConfig;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@SuppressWarnings({"StringConcatenationArgumentToLogCall", "OptionalGetWithoutIsPresent"})
@Component
@Slf4j
public class NewznabCategoryComputer {

    private final ConcurrentHashMap<Integer, Category> idToCategory = new ConcurrentHashMap<>();

    private final CategoryProvider categoryProvider;

    public NewznabCategoryComputer(CategoryProvider categoryProvider) {
        this.categoryProvider = categoryProvider;
    }

    public void computeCategory(SearchResultItem searchResultItem, List<Integer> newznabCategories, IndexerConfig config) {
        if (!newznabCategories.isEmpty()) {
            log.debug(LoggingMarkers.CATEGORY_MAPPING, config.getName() + ":" + "Result {} has newznab categories {} and self-reported category {}", searchResultItem.getTitle(), newznabCategories, searchResultItem.getCategory());
            Integer mostSpecific = newznabCategories.stream().max(Integer::compareTo).get();
            IndexerCategoryConfig mapping = config.getCategoryMapping();
            Category category;
            if (mapping == null) { //May be the case in some corner cases
                category = categoryProvider.fromSearchNewznabCategories(newznabCategories, categoryProvider.getNotAvailable());
                searchResultItem.setOriginalCategory(categoryProvider.getNotAvailable().getName());
                log.debug(LoggingMarkers.CATEGORY_MAPPING, config.getName() + ":" + "No mapping available. Using original category N/A and new category {} for result {}", category, searchResultItem.getTitle());
            } else {
                category = idToCategory.computeIfAbsent(mostSpecific, x -> {
                    Optional<Category> categoryOptional = Optional.empty();
                    if (mapping.getAnime().isPresent() && Objects.equals(mapping.getAnime().get(), mostSpecific)) {
                        categoryOptional = categoryProvider.fromSubtype(Category.Subtype.ANIME);
                    } else if (mapping.getAudiobook().isPresent() && Objects.equals(mapping.getAudiobook().get(), mostSpecific)) {
                        categoryOptional = categoryProvider.fromSubtype(Category.Subtype.AUDIOBOOK);
                    } else if (mapping.getEbook().isPresent() && Objects.equals(mapping.getEbook().get(), mostSpecific)) {
                        categoryOptional = categoryProvider.fromSubtype(Category.Subtype.EBOOK);
                    } else if (mapping.getComic().isPresent() && Objects.equals(mapping.getComic().get(), mostSpecific)) {
                        categoryOptional = categoryProvider.fromSubtype(Category.Subtype.COMIC);
                    } else if (mapping.getMagazine().isPresent() && Objects.equals(mapping.getMagazine().get(), mostSpecific)) {
                        categoryOptional = categoryProvider.fromSubtype(Category.Subtype.MAGAZINE);
                    }
                    return categoryOptional.orElse(categoryProvider.fromResultNewznabCategories(newznabCategories));
                });
                //Use the indexer's own category mapping to build the category name
                searchResultItem.setOriginalCategory(mapping.getNameFromId(mostSpecific));
            }
            if (category == null) {
                log.debug(LoggingMarkers.CATEGORY_MAPPING, config.getName() + ":" + "No category found for {}. Using N/A", searchResultItem.getTitle());
                searchResultItem.setCategory(categoryProvider.getNotAvailable());
            } else {
                log.debug(LoggingMarkers.CATEGORY_MAPPING, config.getName() + ":" + "Determined category {} for {}", category, searchResultItem.getTitle());
                searchResultItem.setCategory(category);
            }
        } else {
            log.debug(LoggingMarkers.CATEGORY_MAPPING, config.getName() + ":" + "No newznab categories exist for {}. Using N/A ", searchResultItem.getTitle());
            searchResultItem.setCategory(categoryProvider.getNotAvailable());
        }
    }
}
