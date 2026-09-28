package org.nzbhydra.config.validation;

import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.MainConfig;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MainConfigValidatorTest {

    @Mock
    private LoggingConfigValidator loggingConfigValidator;

    @InjectMocks
    private MainConfigValidator testee = new MainConfigValidator();

    @ParameterizedTest
    @CsvSource({
            "urlbase, /urlbase",
            "/urlbase, /urlbase",
            "/urlbase/, /urlbase",
            "urlbase/, /urlbase",
            "/, /",
            "//, /",
            "/a//, /a",
            "' urlbase ', /urlbase",
            "/nested/base/, /nested/base"
    })
    void shouldNormalizeUrlBase(String urlBase, String expected) {
        MainConfig newConfig = new MainConfig();
        newConfig.setUrlBase(urlBase);

        MainConfig result = testee.prepareForSaving(new BaseConfig(), newConfig);

        assertThat(result.getUrlBase()).contains(expected);
    }

    @ParameterizedTest
    @CsvSource(value = {
            "NULL",
            "''",
            "' '"
    }, nullValues = "NULL")
    void shouldKeepEmptyUrlBaseEmpty(String urlBase) {
        MainConfig newConfig = new MainConfig();
        newConfig.setUrlBase(urlBase);

        MainConfig result = testee.prepareForSaving(new BaseConfig(), newConfig);

        assertThat(result.getUrlBase()).isEmpty();
    }

    @ParameterizedTest
    @CsvSource({
            "0",
            "-1"
    })
    void shouldReportErrorWhenResultsPageSizeIsLessThanOne(int resultsPageSize) {
        when(loggingConfigValidator.validateConfig(any(), any(), any())).thenReturn(new ConfigValidationResult());
        BaseConfig oldBaseConfig = new BaseConfig();
        BaseConfig newBaseConfig = new BaseConfig();
        newBaseConfig.getMain().setResultsPageSize(resultsPageSize);

        ConfigValidationResult result = testee.validateConfig(oldBaseConfig, newBaseConfig, newBaseConfig.getMain());

        assertThat(result.getErrorMessages()).contains("Results page size must be at least 1 or empty.");
    }

    @ParameterizedTest
    @CsvSource(value = {
            "NULL",
            "1",
            "50"
    }, nullValues = "NULL")
    void shouldNotReportErrorWhenResultsPageSizeIsValid(Integer resultsPageSize) {
        when(loggingConfigValidator.validateConfig(any(), any(), any())).thenReturn(new ConfigValidationResult());
        BaseConfig oldBaseConfig = new BaseConfig();
        BaseConfig newBaseConfig = new BaseConfig();
        newBaseConfig.getMain().setResultsPageSize(resultsPageSize);

        ConfigValidationResult result = testee.validateConfig(oldBaseConfig, newBaseConfig, newBaseConfig.getMain());

        assertThat(result.getErrorMessages()).doesNotContain("Results page size must be at least 1 or empty.");
    }

}
