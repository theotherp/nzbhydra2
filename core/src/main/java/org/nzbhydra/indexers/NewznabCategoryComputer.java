

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

@SuppressWarnings({"StringConcatenationArgumentToLogCall", "OptionalGetWithoutIsPresent"})
@Component
@Slf4j
public class NewznabCategoryComputer {

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
                //Not cached: the subtype ids are per indexer (nzbs.org uses 4050 for ebooks, dognzb for PC), and the
                //Category instances are replaced whenever the config changes, so a cache keyed by id alone served
                //another indexer's mapping and stale categories.
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
                category = categoryOptional.orElseGet(() -> categoryProvider.fromResultNewznabCategories(newznabCategories));
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
