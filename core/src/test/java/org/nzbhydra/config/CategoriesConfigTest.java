package org.nzbhydra.config;

import org.junit.Test;
import org.mockito.InjectMocks;
import org.nzbhydra.config.ValidatingConfig.ConfigValidationResult;
import org.nzbhydra.config.category.CategoriesConfig;
import org.nzbhydra.config.category.Category;

import java.util.Arrays;

import static org.hamcrest.CoreMatchers.containsString;
import static org.hamcrest.core.Is.is;
import static org.junit.Assert.assertThat;

public class CategoriesConfigTest {

    @InjectMocks
    private CategoriesConfig testee = new CategoriesConfig();

    @Test
    public void shouldValidateTorrentsFolder() throws Exception {
        BaseConfig baseConfig = new BaseConfig();

        Category moviesCategory = new Category("Movies");
        testee.getCategories().add(moviesCategory);

        moviesCategory.getNewznabCategories().add(Arrays.asList(2000, 2045));
        validateAndCheckForSublevelError(baseConfig);

        moviesCategory.getNewznabCategories().clear();
        moviesCategory.getNewznabCategories().add(Arrays.asList(2000, 2045, 3000));
        validateAndCheckForSublevelError(baseConfig);

        moviesCategory.getNewznabCategories().clear();
        moviesCategory.getNewznabCategories().add(Arrays.asList(2000, 3045));
        validateAndCheckForNoError(baseConfig);
    }

    private void validateAndCheckForSublevelError(BaseConfig baseConfig) {
        ConfigValidationResult result = testee.validateConfig(baseConfig, testee, null);
        assertThat(result.getWarningMessages().size(), is(1));
        assertThat(result.getWarningMessages().get(0), containsString("sublevel"));
    }

    private void validateAndCheckForNoError(BaseConfig baseConfig) {
        ConfigValidationResult result = testee.validateConfig(baseConfig, testee, null);
        assertThat(result.getWarningMessages().size(), is(0));
    }

}