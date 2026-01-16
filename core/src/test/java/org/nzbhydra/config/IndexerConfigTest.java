

package org.nzbhydra.config;

import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.validation.ConfigValidationResult;
import org.nzbhydra.config.validation.IndexerConfigValidator;

import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;

public class IndexerConfigTest {

    @InjectMocks
    private IndexerConfig testee = new IndexerConfig();
    private IndexerConfigValidator indexerConfigValidator = new IndexerConfigValidator();

    @Test
    void shouldValidateSchedules() {
        testee.setSchedule(Arrays.asList("blabla"));
        testee.setName("indexer");
        BaseConfig baseConfig = new BaseConfig();
        baseConfig.setIndexers(Arrays.asList(testee));
        ConfigValidationResult result = indexerConfigValidator.validateConfig(baseConfig, null, testee);

        assertThat(result.getErrorMessages()).containsExactly("Indexer indexer contains an invalid schedule: blabla");

        testee.setSchedule(Arrays.asList("mo8-10"));
        result = indexerConfigValidator.validateConfig(baseConfig, null, testee);
        assertThat(result.getErrorMessages()).isEmpty();
    }


}
