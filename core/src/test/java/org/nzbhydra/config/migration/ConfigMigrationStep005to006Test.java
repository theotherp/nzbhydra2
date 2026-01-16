

package org.nzbhydra.config.migration;

import com.google.common.io.Resources;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.nzbhydra.Jackson;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigReaderWriter;

import java.nio.charset.Charset;
import java.util.Map;

import static org.assertj.core.api.AssertionsForInterfaceTypes.assertThat;

public class ConfigMigrationStep005to006Test {

    @InjectMocks
    private ConfigMigrationStep005to006 testee = new ConfigMigrationStep005to006();


    @Test
    void migrate() throws Exception {
        String yaml = Resources.toString(ConfigMigrationStep005to006Test.class.getResource("migrate5to6.yaml"), Charset.defaultCharset());

        Map<String, Object> map = Jackson.YAML_MAPPER.readValue(yaml, ConfigReaderWriter.MAP_TYPE_REFERENCE);
        Map<String, Object> migrated = testee.migrate(map);

        String newYaml = Jackson.YAML_MAPPER.writeValueAsString(migrated);
        BaseConfig baseConfig = Jackson.YAML_MAPPER.readValue(newYaml, BaseConfig.class);

        assertThat(baseConfig.getCategoriesConfig().getCategories().get(0).getNewznabCategories().get(0).get(0)).isEqualTo(1000);
        assertThat(baseConfig.getCategoriesConfig().getCategories().get(1).getNewznabCategories().get(0).get(0)).isEqualTo(3000);
        assertThat(baseConfig.getCategoriesConfig().getCategories().get(1).getNewznabCategories().get(1).get(0)).isEqualTo(3030);
    }
}