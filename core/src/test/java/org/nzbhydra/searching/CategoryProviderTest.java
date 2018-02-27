package org.nzbhydra.searching;

import org.junit.Before;
import org.junit.Test;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.CategoriesConfig;
import org.nzbhydra.config.Category;
import org.nzbhydra.config.Category.Subtype;

import java.util.*;

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
        category.setName("4030");
        category.setNewznabCategories(Arrays.asList(4030));
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
        testee.initialize();
    }

    @Test
    public void shouldConvertSearchNewznabCategoriesToInternalCategory() throws Exception {
        assertThat(testee.fromSearchNewznabCategories(Arrays.asList(3000), CategoriesConfig.allCategory).getName(), is("3000,3030"));
        assertThat(testee.fromSearchNewznabCategories(Arrays.asList(3030), CategoriesConfig.allCategory).getName(), is("3000,3030"));
        assertThat(testee.fromSearchNewznabCategories(Arrays.asList(7020), CategoriesConfig.allCategory).getName(), is("7020,8010"));
        assertThat(testee.fromSearchNewznabCategories(Arrays.asList(7000, 7020), CategoriesConfig.allCategory).getName(), is("7020,8010"));

        //Different order
        assertThat(testee.fromSearchNewznabCategories(Arrays.asList(7020, 8010), CategoriesConfig.allCategory).getName(), is("7020,8010"));

        //One general category
        assertThat(testee.fromSearchNewznabCategories(Arrays.asList(4000), CategoriesConfig.allCategory).getName(), is("4000"));

        //Generalized (4020 matches 4000)
        assertThat(testee.fromSearchNewznabCategories(Arrays.asList(4020), CategoriesConfig.allCategory).getName(), is("4000"));

        //Specific trumps general
        assertThat(testee.fromSearchNewznabCategories(Arrays.asList(4090), CategoriesConfig.allCategory).getName(), is("4090"));

        //If a main category and a subcategory are supplied use the main category
        assertThat(testee.fromSearchNewznabCategories(Arrays.asList(4000, 4090), CategoriesConfig.allCategory).getName(), is("4000"));

        //No matching found, use all
        assertThat(testee.fromSearchNewznabCategories(Arrays.asList(7090), CategoriesConfig.allCategory).getName(), is("All"));

        //String input
        assertThat(testee.fromSearchNewznabCategories("4000").getName(), is("4000"));
        assertThat(testee.fromSearchNewznabCategories("7020,8010").getName(), is("7020,8010"));

        //No cats
        assertThat(testee.fromSearchNewznabCategories(Collections.emptyList(), CategoriesConfig.allCategory).getName(), is("All"));
        assertThat(testee.fromSearchNewznabCategories("").getName(), is("N/A"));

        //Two subcategories, both of which have a match -> Use the general one
        assertThat(testee.fromSearchNewznabCategories(Arrays.asList(4030, 4090), CategoriesConfig.allCategory).getName(), is("4000"));

        //Two main categories -> Use the higher one (doesn't really matter, one needs to be used)
        assertThat(testee.fromSearchNewznabCategories(Arrays.asList(3000, 4000), CategoriesConfig.allCategory).getName(), is("4000"));
    }

    @Test
    public void shouldConvertIndexerNewznabCategoriesToInternalCategory() throws Exception {
        //Should return N/A on empty list
        assertThat(testee.fromResultNewznabCategories(Collections.emptyList()).getName(), is("N/A"));

        //Should return more specific matching category
        assertThat(testee.fromResultNewznabCategories(Arrays.asList(4000, 4090)).getName(), is("4090"));

        //Should return matching main category if subcat not found
        assertThat(testee.fromResultNewznabCategories(Arrays.asList(4020)).getName(), is("4000"));

        //Should return N/A if no matching found
        assertThat(testee.fromResultNewznabCategories(Arrays.asList(9999)).getName(), is("N/A"));
    }


    @Test
    public void testcheckCategoryMatchingMainCategory() {
        assertThat(testee.checkCategoryMatchingMainCategory(5030, 5000), is(true));
        assertThat(testee.checkCategoryMatchingMainCategory(5000, 5000), is(true));
        assertThat(testee.checkCategoryMatchingMainCategory(4030, 5000), is(false));
        assertThat(testee.checkCategoryMatchingMainCategory(4000, 5000), is(false));
        assertThat(testee.checkCategoryMatchingMainCategory(4030, 4030), is(false));
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