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

    /**
     * FM-113. Until then this could not be reported at all: {@code CategoriesConfig.setCategories}
     * threw while sorting a nameless entry, inside Jackson's request-body binding, so
     * {@code ConfigWeb.setConfig} never ran and this validator never got a turn. The refusal names
     * the row by position because it has no name to quote.
     */
    @Test
    void shouldRefuseACategoryWithoutAName() {
        BaseConfig baseConfig = new BaseConfig();

        Category moviesCategory = new Category("Movies");
        moviesCategory.getNewznabCategories().add(Arrays.asList(2000, 3045));
        Category namelessCategory = new Category();
        // Both dereferences the new path used to walk into: a null newznab list, and a
        // default-category check that compared against the missing name.
        namelessCategory.setNewznabCategories(null);
        Category tvCategory = new Category("TV");
        tvCategory.getNewznabCategories().add(Arrays.asList(5000, 5045));
        testee.getCategories().add(moviesCategory);
        testee.getCategories().add(namelessCategory);
        testee.getCategories().add(tvCategory);
        // The default category is the entry *after* the nameless one, so the `noneMatch` in the
        // default-category check has to walk past the nameless entry instead of short-circuiting
        // before it -- otherwise this case passes with that dereference still unguarded.
        testee.setDefaultCategory("TV");

        ConfigValidationResult result = categoriesConfigValidator.validateConfig(baseConfig, null, testee);

        assertThat(result.isOk()).isFalse();
        assertThat(result.getErrorMessages()).contains("Category number 2 does not have a name");
    }

    @Test
    void shouldRefuseACategoryWithABlankName() {
        BaseConfig baseConfig = new BaseConfig();

        Category blankNamedCategory = new Category("");
        blankNamedCategory.getNewznabCategories().add(Arrays.asList(2000, 3045));
        testee.getCategories().add(blankNamedCategory);

        ConfigValidationResult result = categoriesConfigValidator.validateConfig(baseConfig, null, testee);

        assertThat(result.isOk()).isFalse();
        assertThat(result.getErrorMessages()).contains("Category number 1 does not have a name");
    }

    @Test
    void shouldStillAcceptACategoryConfigurationThatHasNames() {
        BaseConfig baseConfig = new BaseConfig();

        Category moviesCategory = new Category("Movies");
        moviesCategory.getNewznabCategories().add(Arrays.asList(2000, 3045));
        testee.getCategories().add(moviesCategory);

        ConfigValidationResult result = categoriesConfigValidator.validateConfig(baseConfig, null, testee);

        assertThat(result.isOk()).isTrue();
        assertThat(result.getErrorMessages()).isEmpty();
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
