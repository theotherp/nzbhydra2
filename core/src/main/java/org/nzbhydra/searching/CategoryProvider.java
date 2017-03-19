package org.nzbhydra.searching;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import javax.annotation.PostConstruct;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@SuppressWarnings("unused")
@Component
@ConfigurationProperties
@EnableConfigurationProperties
public class CategoryProvider {

    private static final Logger logger = LoggerFactory.getLogger(CategoryProvider.class);

    private List<Category> categories;
    protected Map<String, Category> categoryMap;

    @PostConstruct
    protected void fillMap() {
        if (categories != null) {
            categoryMap = categories.stream().collect(Collectors.toMap(Category::getName, Function.identity()));
        } else {
            logger.error("Configuration incomplete, categories not set");
            categoryMap = Collections.emptyMap();
        }
    }

    public List<Category> getCategories() {
        return categories;
    }

    public void setCategories(List<Category> categories) {
        this.categories = categories;
    }

    public Category getByName(String name) {
        //TODO do something if not found
        return categoryMap.get(name);
    }


    /**
     * Should only be called to parse a categories string getInfos an incoming result.
     * Returns a category converted getInfos the newznab categories. Returns the "N/A" category if no matching category is found
     *
     * @param cats A string (possibly comma separated) containing newznab categories.
     * @return
     */
    public Category fromNewznabCategories(String cats) {
        if (StringUtils.isEmpty(cats)) {
            return getByName("n/a");
        }

        try {
            return fromNewznabCategories(Arrays.stream(cats.split(",")).map(Integer::valueOf).collect(Collectors.toList()));
        } catch (NumberFormatException e) {
            logger.error("Unable to parse categories string '{}'", cats);
            return getByName("n/a");
        }
    }

    /**
     * Should only be called for ingoing conversion. Returns the "All" category if no matching category is found
     *
     * @param cats List of newznab categories
     * @return The matching configured category or "All" if none is found
     */
    public Category fromNewznabCategories(List<Integer> cats) {
        if (cats == null || cats.size() == 0) {
            return getByName("all");
        }

        Category matchingCategory1 = getCategory(cats);
        if (matchingCategory1 != null) {
            return matchingCategory1;
        }

        return getByName("all");
    }

    protected Category getCategory(List<Integer> cats) {
        Optional<Category> matchingCategory = categories.stream().filter(x -> x.getNewznabCategories().stream().anyMatch(cats::contains)).findFirst();

        if (matchingCategory.isPresent()) {
            return matchingCategory.get();
        }
        //Let's try to find a more general one
        matchingCategory = categories.stream().filter(x -> cats.stream().anyMatch(y -> x.getNewznabCategories().contains(y / 1000 * 1000))).findFirst();
        if (matchingCategory.isPresent()) {
            return matchingCategory.get();
        }
        return null;
    }

}
