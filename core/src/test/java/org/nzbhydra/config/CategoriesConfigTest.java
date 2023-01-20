package org.nzbhydra.config;

import org.junit.jupiter.api.Test;
import org.nzbhydra.config.category.CategoriesConfig;
import org.nzbhydra.config.category.Category;
import org.nzbhydra.config.validation.CategoriesConfigValidator;
import org.nzbhydra.config.validation.ConfigValidationResult;

import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;

public class CategoriesConfigTest {

    private final CategoriesConfig testee = new CategoriesConfig();
    private final CategoriesConfigValidator categoriesConfigValidator = new CategoriesConfigValidator();

    @Test
    void shouldValidateTorrentsFolder() throws Exception {
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
        ConfigValidationResult result = categoriesConfigValidator.validateConfig(baseConfig, null, testee);
        assertThat(result.getWarningMessages().size()).isEqualTo(1);
        assertThat(result.getWarningMessages().get(0)).contains("sublevel");
    }

    private void validateAndCheckForNoError(BaseConfig baseConfig) {
        ConfigValidationResult result = categoriesConfigValidator.validateConfig(baseConfig, null, testee);
        assertThat(result.getWarningMessages().size()).isEqualTo(0);
    }

}
