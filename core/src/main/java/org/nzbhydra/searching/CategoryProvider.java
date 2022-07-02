package org.nzbhydra.searching;

import com.google.common.base.Joiner;
import com.google.common.base.Strings;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigChangedEvent;
import org.nzbhydra.config.SearchSourceRestriction;
import org.nzbhydra.config.category.CategoriesConfig;
import org.nzbhydra.config.category.Category;
import org.nzbhydra.config.category.Category.Subtype;
import org.nzbhydra.logging.LoggingMarkers;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@SuppressWarnings("unused")
@Component
@ConfigurationProperties
@EnableConfigurationProperties
public class CategoryProvider implements InitializingBean {


    private static final Logger logger = LoggerFactory.getLogger(CategoryProvider.class);

    /**
     * List of all categories in the order in which they are configured and to be shown in the dropdown
     */
    private List<Category> categories;

    /**
     * Map of categories by name, newly initialized whenever categories are changed
     */
    protected Map<String, Category> categoryMap = new HashMap<>();

    /**
     * Map of categories by their newznab numbers. Values may appear multiple times
     */
    protected Map<Integer, Category> categoryMapByNumber = new HashMap<>();
    protected Map<List<Integer>, Category> categoryMapByMultipleNumber = new HashMap<>();

    @Autowired
    protected BaseConfig baseConfig;

    public static final Category naCategory = new Category("N/A");

    public CategoryProvider() {
        naCategory.setApplyRestrictionsType(SearchSourceRestriction.NONE);
        naCategory.setIgnoreResultsFrom(SearchSourceRestriction.NONE);
        naCategory.setMayBeSelected(false);
        naCategory.setSearchType(null);
    }

    @Override
    public void afterPropertiesSet() {
        initialize();
    }

    @org.springframework.context.event.EventListener
    public void handleNewConfigEvent(ConfigChangedEvent newConfig) {
        initialize();
    }

    protected void initialize() {
        categories = baseConfig.getCategoriesConfig().getCategories();
        if (categories != null) {
            categoryMap = categories.stream().collect(Collectors.toMap(Category::getName, Function.identity()));
            categoryMapByNumber.clear();
            for (Category category : categories) {
                for (Integer integer : category.getNewznabCategories().stream().filter(x -> x.size() == 1).map(x -> x.get(0)).collect(Collectors.toList())) {
                    categoryMapByNumber.put(integer, category);
                }
                category.getNewznabCategories().stream().filter(x -> x.size() > 1).forEach(x -> categoryMapByMultipleNumber.put(x, category));
            }
        } else {
            logger.error("Configuration incomplete, categories not set");
            categoryMap = Collections.emptyMap();
            categoryMapByNumber = new HashMap<>();
        }
    }

    public List<Category> getCategories() {
        return categories;
    }

    public void setCategories(List<Category> categories) {
        this.categories = categories;
    }

    public Category getByInternalName(String name) {
        if (name == null) {
            return getNotAvailable();
        }
        if (name.equalsIgnoreCase("all")) {
            return CategoriesConfig.allCategory;
        }
        if (!categoryMap.containsKey(name)) {
            return getNotAvailable();
        }
        return categoryMap.get(name);
    }

    public Category getNotAvailable() {
        return naCategory;
    }


    /**
     * Should only be called to parse a categories string for an incoming result.
     * Returns a category converted getInfos the newznab categories. Returns the "N/A" category if no matching category is found
     *
     * @param cats A string (possibly comma separated) containing newznab categories.
     * @return A category
     */
    public Category fromSearchNewznabCategories(String cats) {
        if (Strings.isNullOrEmpty(cats)) {
            return getNotAvailable();
        }

        try {
            return fromSearchNewznabCategories(Arrays.stream(cats.split(",")).map(Integer::valueOf).collect(Collectors.toList()), getNotAvailable());
        } catch (NumberFormatException e) {
            logger.error("Unable to parse categories string '{}'", cats);
            return getNotAvailable();
        }
    }

    public Optional<Category> fromSubtype(Subtype subtype) {
        return categories.stream().filter(x -> x.getSubtype() == subtype).findFirst();
    }


    /**
     * Conversion of incoming API search categories. Returns the supplied default category if no matching category is found
     *
     * @param cats List of newznab categories
     * @return The matching configured category or "All" if none is found
     */
    public Category fromSearchNewznabCategories(List<Integer> cats, Category defaultCategory) {
        if (cats == null || cats.size() == 0) {
            return defaultCategory;
        }

        Category matchingCategory = getCategory(cats, defaultCategory);
        if (matchingCategory != null) {
            return matchingCategory;
        }

        return defaultCategory;
    }

    /**
     * Conversion of search result newznab categories to internal category. Returns the N/A category if no matching category is found
     *
     * @param cats List of newznab categories
     * @return The matching configured category or "All" if none is found
     */
    public Category fromResultNewznabCategories(List<Integer> cats) {
        if (cats == null || cats.size() == 0) {
            logger.debug(LoggingMarkers.CATEGORY_MAPPING, "Empty newznab categories -> N/A");
            return naCategory;
        }
        //Start with higher numbers which are usually more specific (4050 is more specific than 4000, for example)
        cats.sort((o1, o2) -> Integer.compare(o2, o1));
        return getMatchingCategoryOrMatchingMainCategory(cats, naCategory);
    }

    protected Category getCategory(List<Integer> cats, Category defaultCategory) {
        if (cats == null || cats.isEmpty()) {
            return defaultCategory;
        }
        if (cats.size() == 1) {
            return categoryMapByNumber.getOrDefault(cats.get(0), getMatchingCategoryOrMatchingMainCategory(cats, defaultCategory));
        }

        Category result = null;
        cats.sort((o1, o2) -> Integer.compare(o2, o1));
        String catsString = Joiner.on(",").join(cats);

        //If the list contains a main category always use that one
        List<Integer> foundMainCategories = cats.stream().filter(x -> x % 1000 == 0).collect(Collectors.toList());
        if (!foundMainCategories.isEmpty()) {
            Category category = categoryMapByNumber.get(foundMainCategories.get(0));
            if (category != null) {
                if (foundMainCategories.size() > 1) {
                    logger.warn("Search supplied multiple main categories: {}. Will use {}", catsString, category.getName());
                } else if (cats.size() > 1) {
                    logger.warn("Search supplied a general category and a subcategory: {}. Will use the category {}", catsString, category.getName());
                }
                return category;
            }
        }


        if (cats.size() == 1) {
            //No main categories found, specific subcategory must've been supplied
            result = getMatchingCategoryOrMatchingMainCategory(cats, defaultCategory);
        } else {
            List<Integer> matchingSubcategories = cats.stream().filter(cat -> categoryMapByNumber.containsKey(cat)).collect(Collectors.toList());
            if (matchingSubcategories.size() == 1) {
                result = categoryMapByNumber.get(matchingSubcategories.get(0));
            } else if (matchingSubcategories.size() == 0) {
                result = getMatchingCategoryOrMatchingMainCategory(cats, defaultCategory);
            } else if (matchingSubcategories.stream().map(x -> categoryMapByNumber.get(x)).distinct().count() == 1) {
                //All match the sub category
                result = categoryMapByNumber.get(matchingSubcategories.get(0));
            }
        }
        if (result != null) {
            logger.debug("Found category {} matching newznab categories {}", result.getName(), catsString);
            return result;
        }

        logger.debug("The supplied categories {} match multiple configured categories", catsString);
        for (Integer cat : cats) {
            for (Category category : categories) {
                Optional<List<Integer>> matchingMainCategory = category.getNewznabCategories().stream().filter(x -> x.size() == 1 && checkCategoryMatchingMainCategory(cat, x.get(0))).findFirst();
                if (matchingMainCategory.isPresent()) {
                    logger.debug("The supplied categories {} match the configured main category {} and will be assigned to that", catsString, category.getName());
                    return category;
                }
            }
        }
        //No matching main category was found, use any one
        result = getMatchingCategoryOrMatchingMainCategory(cats, defaultCategory);
        logger.warn("Unable to match the supplied categories {} to any specific or general category. Will use {}", catsString, (result == null ? defaultCategory : result).getName());
        return result;
    }

    public static boolean checkCategoryMatchingMainCategory(int cat, int possibleMainCat) {
        return possibleMainCat % 1000 == 0 && cat / 1000 == possibleMainCat / 1000;
    }

    public Category getMatchingCategoryOrMatchingMainCategory(List<Integer> cats, Category defaultCategory) {
        //Try to find categories with combined numbers which match the provided numbers
        for (Map.Entry<List<Integer>, Category> listCategoryEntry : categoryMapByMultipleNumber.entrySet()) {
            if (new HashSet<>(cats).containsAll(listCategoryEntry.getKey())) {
                logger.debug(LoggingMarkers.CATEGORY_MAPPING, "Determined {} from {} via combined categories {}", listCategoryEntry.getValue(), cats, listCategoryEntry.getKey());
                return listCategoryEntry.getValue();
            }
        }

        //Try to find a category that matches any of the provided numbers
        for (Integer cat : cats) {
            if (categoryMapByNumber.containsKey(cat)) {
                logger.debug(LoggingMarkers.CATEGORY_MAPPING, "Determined {} matching directly {}", categoryMapByNumber.get(cat), cat);
                return categoryMapByNumber.get(cat);
            }
        }

        //Let's try to find a more general one
        Optional<Category> found = Optional.empty();
        for (Category category : categories) {
            List<Integer> categorySingleNewznabNumbers = category.getNewznabCategories().stream().filter(x -> x.size() == 1).map(x -> x.get(0)).collect(Collectors.toList());
            for (Integer cat : cats) {
                if (categorySingleNewznabNumbers.contains(cat / 1000 * 1000)) {
                    logger.debug(LoggingMarkers.CATEGORY_MAPPING, "Determined {} matching generally {}", cat, category);
                    return category;
                }
            }
        }
        logger.debug(LoggingMarkers.CATEGORY_MAPPING, "Unable to match category to {}. Using default category {}", cats, defaultCategory);
        return defaultCategory;
    }


}
