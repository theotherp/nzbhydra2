package org.nzbhydra.config.migration;

import org.junit.jupiter.api.Test;
import org.nzbhydra.config.BaseConfig;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;

class ConfigMigrationStep024to025Test {

    private final ConfigMigrationStep024to025 testee = new ConfigMigrationStep024to025();

    private final TypeReference<HashMap<String, Object>> typeRef = new TypeReference<HashMap<String, Object>>() {
    };
    private final ObjectMapper objectMapper = new JsonMapper();

    @Test
    void shouldMigrateOldDefaultWriteDelayToNewDefault() {
        BaseConfig input = new BaseConfig();
        input.getMain().setDatabaseWriteDelay(5000);
        Map<String, Object> map = objectMapper.convertValue(input, typeRef);

        Map<String, Object> migrated = testee.migrate(map);

        BaseConfig result = objectMapper.convertValue(migrated, BaseConfig.class);
        assertThat(result.getMain().getDatabaseWriteDelay()).isEqualTo(500);
    }

    @Test
    void shouldNotChangeCustomWriteDelay() {
        BaseConfig input = new BaseConfig();
        input.getMain().setDatabaseWriteDelay(1234);
        Map<String, Object> map = objectMapper.convertValue(input, typeRef);

        Map<String, Object> migrated = testee.migrate(map);

        BaseConfig result = objectMapper.convertValue(migrated, BaseConfig.class);
        assertThat(result.getMain().getDatabaseWriteDelay()).isEqualTo(1234);
    }

    @Test
    void shouldBeForVersion24() {
        assertThat(testee.forVersion()).isEqualTo(24);
    }
}
