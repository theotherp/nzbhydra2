package org.nzbhydra.searching;

import com.google.common.base.Joiner;
import org.nzbhydra.config.*;
import org.nzbhydra.config.Category.Subtype;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.*;
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
    public void afterPropertiesSet() throws Exception {
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
                for (Integer integer : category.getNewznabCategories()) {
                    categoryMapByNumber.put(integer, category);
                }
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
        if (name.toLowerCase().equals("all")) {
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
     * @return
     */
    public Category fromSearchNewznabCategories(String cats) {
        if (StringUtils.isEmpty(cats)) {
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
            return naCategory;
        }
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

        Category result;
        cats.sort((o1, o2) -> Integer.compare(o2, o1));
        String catsString = Joiner.on(",").join(cats);

        //If the list contains a main category always use that one
        List<Integer> foundMainCategories = cats.stream().filter(x -> x % 1000 == 0).collect(Collectors.toList());
        if (!foundMainCategories.isEmpty()) {
            Category category = categoryMapByNumber.get(foundMainCategories.get(0));
            if (foundMainCategories.size() > 1) {
                logger.warn("Search supplied multiple main categories: {}. Will use ", catsString, category.getName());
            } else if (cats.size() > 1) {
                logger.warn("Search supplied a general category and a subcategory: {}. Will use the subcategory {}", catsString, category.getName());
            }
            return category;
        }


        if (cats.size() == 1) {
            //No main categories found, specific subcategory must've been supplied
            return getMatchingCategoryOrMatchingMainCategory(cats, defaultCategory);
        }

        List<Integer> matchingSubcategories = cats.stream().filter(cat -> categoryMapByNumber.containsKey(cat)).collect(Collectors.toList());
        if (matchingSubcategories.size() == 1) {
            return categoryMapByNumber.get(matchingSubcategories.get(0));
        } else if (matchingSubcategories.size() == 0) {
            return getMatchingCategoryOrMatchingMainCategory(cats, defaultCategory);
        }
        logger.debug("The supplied categories {} match multiple configured categories", catsString);
        for (Integer cat : cats) {
            for (Category category : categories) {
                Optional<Integer> matchingMainCategory = category.getNewznabCategories().stream().filter(x -> checkCategoryMatchingMainCategory(cat, x)).findFirst();
                if (matchingMainCategory.isPresent()) {
                    logger.debug("The supplied categories {} match the configured main category {} and will be assigned to that", catsString, category.getName());
                    return category;
                }
            }
        }
        //No matching main category was found, use any one
        result = getMatchingCategoryOrMatchingMainCategory(cats, defaultCategory);
        logger.warn("Unable to match the supplied categories to any specific or general category. Will use {}", catsString, (result == null ? defaultCategory : result).getName());
        return result;

    }

    protected boolean checkCategoryMatchingMainCategory(int cat, int possibleMainCat) {
        return possibleMainCat % 1000 == 0 && cat / 1000 == possibleMainCat / 1000;
    }


    public Category getMatchingCategoryOrMatchingMainCategory(List<Integer> cats, Category defaultCategory) {
        Optional<Category> matchingCategory;
        for (Integer cat : cats) {
            if (categoryMapByNumber.containsKey(cat)) {
                return categoryMapByNumber.get(cat);
            }
        }

        //Let's try to find a more general one
        matchingCategory = categories.stream().filter(x -> cats.stream().anyMatch(y -> x.getNewznabCategories().contains(y / 1000 * 1000))).findFirst();
        return matchingCategory.orElse(defaultCategory);
    }


}
