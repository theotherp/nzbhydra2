package org.nzbhydra.config.validation;

import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.MainConfig;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class MainConfigValidatorTest {

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

}
