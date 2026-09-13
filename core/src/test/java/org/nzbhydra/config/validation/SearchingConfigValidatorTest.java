package org.nzbhydra.config.validation;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.SearchingConfig;
import org.nzbhydra.config.searching.CustomQueryAndTitleMapping;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SearchingConfigValidatorTest {

    private SearchingConfigValidator testee;

    @BeforeEach
    void setUp() {
        testee = new SearchingConfigValidator();
    }

    @Test
    void shouldCheckRegexOfDisabledMappings() {
        final CustomQueryAndTitleMapping broken = new CustomQueryAndTitleMapping("SEARCH;QUERY;[;whatever;false");
        broken.setEnabled(false);

        final ConfigValidationResult result = validate(broken);

        assertThat(result.isOk()).isFalse();
        assertThat(result.getErrorMessages()).anySatisfy(x -> assertThat(x).contains("Unable to process mapping"));
    }

    @Test
    void shouldCheckRegexOfResultTitleMappings() {
        final CustomQueryAndTitleMapping broken = new CustomQueryAndTitleMapping("SEARCH;RESULT_TITLE;[;whatever;false");

        final ConfigValidationResult result = validate(broken);

        assertThat(result.isOk()).isFalse();
        assertThat(result.getErrorMessages()).anySatisfy(x -> assertThat(x).contains("Unable to process mapping"));
    }

    @Test
    void shouldWarnAboutDuplicateWholeStringMappings() {
        final CustomQueryAndTitleMapping first = new CustomQueryAndTitleMapping("SEARCH;QUERY;some title;first;true");
        first.setName("First one");
        final CustomQueryAndTitleMapping second = new CustomQueryAndTitleMapping("SEARCH;QUERY;some title;second;true");
        second.setName("Second one");

        final ConfigValidationResult result = validate(first, second);

        assertThat(result.isOk()).isTrue();
        assertThat(result.getErrorMessages()).isEmpty();
        assertThat(result.getWarningMessages()).anySatisfy(x -> assertThat(x).contains("First one").contains("Second one").contains("some title"));
    }

    @Test
    void shouldNotWarnAboutDuplicateWholeStringMappingsWhenOneIsDisabled() {
        final CustomQueryAndTitleMapping first = new CustomQueryAndTitleMapping("SEARCH;QUERY;some title;first;true");
        final CustomQueryAndTitleMapping second = new CustomQueryAndTitleMapping("SEARCH;QUERY;some title;second;true");
        second.setEnabled(false);

        final ConfigValidationResult result = validate(first, second);

        assertThat(result.isOk()).isTrue();
        assertThat(result.getWarningMessages()).isEmpty();
    }

    @Test
    void shouldNotWarnAboutMappingsWhichDoNotMatchTheWholeString() {
        final CustomQueryAndTitleMapping first = new CustomQueryAndTitleMapping("SEARCH;QUERY;some title;first;false");
        final CustomQueryAndTitleMapping second = new CustomQueryAndTitleMapping("SEARCH;QUERY;some title;second;false");

        final ConfigValidationResult result = validate(first, second);

        assertThat(result.isOk()).isTrue();
        assertThat(result.getWarningMessages()).isEmpty();
    }

    private ConfigValidationResult validate(CustomQueryAndTitleMapping... mappings) {
        final BaseConfig baseConfig = new BaseConfig();
        final SearchingConfig searchingConfig = baseConfig.getSearching();
        searchingConfig.setCustomMappings(List.of(mappings));
        return testee.validateConfig(new BaseConfig(), baseConfig, searchingConfig);
    }
}
