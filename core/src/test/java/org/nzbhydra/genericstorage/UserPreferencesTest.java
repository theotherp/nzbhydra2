package org.nzbhydra.genericstorage;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.nzbhydra.Jackson;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.BaseConfigHandler;
import org.nzbhydra.config.ConfigProvider;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.NullNode;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class UserPreferencesTest {

    private final BaseConfig baseConfig = new BaseConfig();
    private final GenericStorage genericStorage = new GenericStorage();

    @Mock
    private ConfigProvider configProvider;
    @Mock
    private BaseConfigHandler baseConfigHandler;
    @InjectMocks
    private UserPreferences testee;

    @BeforeEach
    void setUp() {
        when(configProvider.getBaseConfig()).thenReturn(baseConfig);
        ReflectionTestUtils.setField(genericStorage, "configProvider", configProvider);
        ReflectionTestUtils.setField(genericStorage, "baseConfigHandler", baseConfigHandler);
        ReflectionTestUtils.setField(testee, "genericStorage", genericStorage);
    }

    private static JsonNode json(String json) {
        return Jackson.JSON_MAPPER.readTree(json);
    }

    @Test
    void shouldStoreSectionsPerUserAndSaveTheConfig() {
        testee.put("alice", "searchResults", json("{\"compactRows\":true}"));
        testee.put("alice", "statsDashboard", json("{\"includeDisabled\":false}"));
        testee.put("bob", "searchResults", json("{\"compactRows\":false}"));
        testee.put(null, "searchResults", json("{\"showCovers\":true}"));

        assertThat(testee.get("alice")).isEqualTo(Map.of(
                "searchResults", Map.of("compactRows", true),
                "statsDashboard", Map.of("includeDisabled", false)));
        assertThat(testee.get("bob")).isEqualTo(Map.of("searchResults", Map.of("compactRows", false)));
        assertThat(testee.get(null)).isEqualTo(Map.of("searchResults", Map.of("showCovers", true)));
        assertThat(baseConfig.getGenericStorage()).containsOnlyKeys("userPreferences-alice", "userPreferences-bob", "userPreferences");
        verify(baseConfigHandler, times(4)).save(true);
    }

    @Test
    void shouldReplaceOnlyTheWrittenSection() {
        testee.put("alice", "searchResults", json("{\"compactRows\":true,\"showCovers\":true}"));
        testee.put("alice", "config", json("{\"showAdvanced\":true}"));

        testee.put("alice", "searchResults", json("{\"compactRows\":false}"));

        assertThat(testee.get("alice")).isEqualTo(Map.of(
                "searchResults", Map.of("compactRows", false),
                "config", Map.of("showAdvanced", true)));
    }

    @Test
    void shouldRemoveASectionWrittenAsNullAndTheRecordWithItsLastSection() {
        testee.put("alice", "searchResults", json("{\"compactRows\":true}"));
        testee.put("alice", "config", json("{\"showAdvanced\":true}"));

        testee.put("alice", "config", NullNode.getInstance());
        assertThat(testee.get("alice")).containsOnlyKeys("searchResults");

        testee.put("alice", "searchResults", null);
        assertThat(testee.get("alice")).isEmpty();
        assertThat(baseConfig.getGenericStorage()).doesNotContainKey("userPreferences-alice");
    }

    @Test
    void shouldRefuseInvalidSectionNames() {
        assertThatThrownBy(() -> testee.put("alice", "", json("true"))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> testee.put("alice", "a/b", json("true"))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> testee.put("alice", "x".repeat(65), json("true"))).isInstanceOf(IllegalArgumentException.class);
        assertThat(baseConfig.getGenericStorage()).isEmpty();
    }

    @Test
    void shouldRefuseARecordLargerThanTheLimitAndKeepTheStoredOne() {
        testee.put("alice", "searchResults", json("{\"compactRows\":true}"));

        final String tooLarge = "\"" + "x".repeat(UserPreferences.MAX_SIZE) + "\"";
        assertThatThrownBy(() -> testee.put("alice", "other", json(tooLarge)))
                .isInstanceOf(UserPreferences.RecordTooLargeException.class);

        assertThat(testee.get("alice")).isEqualTo(Map.of("searchResults", Map.of("compactRows", true)));
    }

    @Test
    void shouldMeasureTheLimitInBytes() {
        //Fewer characters than the limit, but more bytes
        final String multiByte = "\"" + "\u00e4".repeat(UserPreferences.MAX_SIZE / 2) + "\"";
        assertThatThrownBy(() -> testee.put("alice", "other", json(multiByte)))
                .isInstanceOf(UserPreferences.RecordTooLargeException.class);
    }

    @Test
    void shouldTreatAnUnreadableRecordAsEmpty() {
        baseConfig.getGenericStorage().put("userPreferences-alice", "not json");
        assertThat(testee.get("alice")).isEmpty();

        baseConfig.getGenericStorage().put("userPreferences-alice", "\"a string\"");
        assertThat(testee.get("alice")).isEmpty();
        verify(baseConfigHandler, never()).save(true);
    }

    @Test
    void shouldReserveTheKeyPrefix() {
        assertThat(UserPreferences.isReservedKey("userPreferences")).isTrue();
        assertThat(UserPreferences.isReservedKey("userPreferences-alice")).isTrue();
        assertThat(UserPreferences.isReservedKey("themePreference")).isFalse();
    }
}
