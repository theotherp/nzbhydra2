package org.nzbhydra.searching;

import org.junit.Before;
import org.junit.Test;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.CategoriesConfig;
import org.nzbhydra.config.Category;
import org.nzbhydra.config.Category.Subtype;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.hamcrest.Matchers.is;
import static org.junit.Assert.assertThat;

public class CategoryProviderTest {

    CategoryProvider testee = new CategoryProvider();

    @Before
    public void setUp() throws Exception {
        List<Category> categories = new ArrayList<>();
        Category category = new Category();
        category.setName("all");
        category.setNewznabCategories(Collections.emptyList());
        categories.add(category);

        category = new Category();
        category.setName("n/a");
        category.setNewznabCategories(Collections.emptyList());
        categories.add(category);

        category = new Category();
        category.setName("3000,3030");
        category.setNewznabCategories(Arrays.asList(3000, 3030));
        categories.add(category);

        category = new Category();
        category.setName("4000");
        category.setNewznabCategories(Arrays.asList(4000));
        categories.add(category);

        category = new Category();
        category.setName("4090");
        category.setSubtype(Subtype.COMIC);
        category.setNewznabCategories(Arrays.asList(4090));
        categories.add(category);

        category = new Category();
        category.setName("7020,8010");
        category.setSubtype(Subtype.ANIME);
        category.setNewznabCategories(Arrays.asList(7020, 8010));
        categories.add(category);
        BaseConfig baseConfig = new BaseConfig();
        CategoriesConfig categoriesConfig = new CategoriesConfig();
        categoriesConfig.setCategories(categories);
        baseConfig.setCategoriesConfig(categoriesConfig);
        testee.baseConfig = baseConfig;
        testee.afterPropertiesSet();
    }

    @Test
    public void fromNewznabCategories() throws Exception {
        assertThat(testee.fromNewznabCategories(Arrays.asList(3000), CategoriesConfig.allCategory).getName(), is("3000,3030"));
        assertThat(testee.fromNewznabCategories(Arrays.asList(3030), CategoriesConfig.allCategory).getName(), is("3000,3030"));
        assertThat(testee.fromNewznabCategories(Arrays.asList(7020), CategoriesConfig.allCategory).getName(), is("7020,8010"));

        //Different order
        assertThat(testee.fromNewznabCategories(Arrays.asList(7020, 8010), CategoriesConfig.allCategory).getName(), is("7020,8010"));

        //One general category
        assertThat(testee.fromNewznabCategories(Arrays.asList(4000), CategoriesConfig.allCategory).getName(), is("4000"));

        //Generalized (4020 matches 4000)
        assertThat(testee.fromNewznabCategories(Arrays.asList(4020), CategoriesConfig.allCategory).getName(), is("4000"));

        //Specific trumps general
        assertThat(testee.fromNewznabCategories(Arrays.asList(4090), CategoriesConfig.allCategory).getName(), is("4090"));

        //Use the more specific one
        assertThat(testee.fromNewznabCategories(Arrays.asList(4000, 4090), CategoriesConfig.allCategory).getName(), is("4090"));

        //None found
        assertThat(testee.fromNewznabCategories(Arrays.asList(7090), CategoriesConfig.allCategory).getName(), is("All"));

        //String input
        assertThat(testee.fromNewznabCategories("4000").getName(), is("4000"));
        assertThat(testee.fromNewznabCategories("7020,8010").getName(), is("7020,8010"));

        //No cats
        assertThat(testee.fromNewznabCategories(Collections.emptyList(), CategoriesConfig.allCategory).getName(), is("All"));
        assertThat(testee.fromNewznabCategories("").getName(), is("N/A"));
    }

    @Test
    public void shouldFindBySubtype() {
        Optional<Category> animeOptional = testee.fromSubtype(Subtype.ANIME);
        assertThat(animeOptional.isPresent(), is(true));
        assertThat(animeOptional.get().getName(), is("7020,8010"));

        Optional<Category> magazineOptional = testee.fromSubtype(Subtype.MAGAZINE);
        assertThat(magazineOptional.isPresent(), is(false));
    }

}