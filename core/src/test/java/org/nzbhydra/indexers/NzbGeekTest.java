package org.nzbhydra.indexers;

import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

public class NzbGeekTest {

    @Mock
    private ConfigProvider configProvider;

    @InjectMocks
    private NzbGeek testee;


    @Test
    void shouldNotUseMoreThan6WordsForNzbGeek() throws Exception {
        MockitoAnnotations.openMocks(this);
        when(configProvider.getBaseConfig()).thenReturn(new BaseConfig());

        String query = "1 2 3 4 5 6 7 8 9";
        assertThat(testee.cleanupQuery(query)).isEqualTo("1 2 3 4 5 6");
    }


}
