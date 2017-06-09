package org.nzbhydra.searching;

import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.CategoriesConfig;
import org.nzbhydra.config.Category;
import org.nzbhydra.config.ConfigChangedEvent;
import org.nzbhydra.config.SearchSourceRestriction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
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
    protected Map<String, Category> categoryMap;

    @Autowired
    protected BaseConfig baseConfig;

    private final Category naCategory = new Category("N/A");

    public CategoryProvider() {
        naCategory.setApplyRestrictionsType(SearchSourceRestriction.NONE);
        naCategory.setIgnoreResultsFrom(SearchSourceRestriction.NONE);
        naCategory.setMayBeSelected(false);
        naCategory.setSearchType(null);

    }

    @Override
    public void afterPropertiesSet() throws Exception {
        categories = baseConfig.getCategoriesConfig().getCategories();
        if (categories != null) {
            categoryMap = categories.stream().collect(Collectors.toMap(Category::getName, Function.identity()));
        } else {
            logger.error("Configuration incomplete, categories not set");
            categoryMap = Collections.emptyMap();
        }
    }

    @org.springframework.context.event.EventListener
    public void handleNewConfig(ConfigChangedEvent newConfig) {
        categories = baseConfig.getCategoriesConfig().getCategories();
        categoryMap = categories.stream().collect(Collectors.toMap(Category::getName, Function.identity()));
    }

    public List<Category> getCategories() {
        return categories;
    }

    public void setCategories(List<Category> categories) {
        this.categories = categories;
    }

    public Category getByName(String name) {
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
    public Category fromNewznabCategories(String cats) {
        if (StringUtils.isEmpty(cats)) {
            return getNotAvailable();
        }

        try {
            return fromNewznabCategories(Arrays.stream(cats.split(",")).map(Integer::valueOf).collect(Collectors.toList()));
        } catch (NumberFormatException e) {
            logger.error("Unable to parse categories string '{}'", cats);
            return getNotAvailable();
        }
    }

    /**
     * Should only be called for conversion of incoming searches. Returns the "All" category if no matching category is found
     *
     * @param cats List of newznab categories
     * @return The matching configured category or "All" if none is found
     */
    public Category fromNewznabCategories(List<Integer> cats) {
        if (cats == null || cats.size() == 0) {
            return CategoriesConfig.allCategory;
        }

        Category matchingCategory = getCategory(cats);
        if (matchingCategory != null) {
            return matchingCategory;
        }

        return CategoriesConfig.allCategory;
    }

    protected Category getCategory(List<Integer> cats) {
        cats.sort((o1, o2) -> Integer.compare(o2, o1));
        Optional<Category> matchingCategory;
        for (Integer cat : cats) {
            matchingCategory = categories.stream().filter(x -> x.getNewznabCategories().stream().anyMatch(y -> Objects.equals(y, cat))).findFirst();
            if (matchingCategory.isPresent()) {
                return matchingCategory.get();
            }
        }

        //Let's try to find a more general one
        matchingCategory = categories.stream().filter(x -> cats.stream().anyMatch(y -> x.getNewznabCategories().contains(y / 1000 * 1000))).findFirst();
        return matchingCategory.orElse(null);
    }


}
