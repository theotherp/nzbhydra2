package org.nzbhydra.config.migration;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class ConfigMigrationStep026to027Test {

    private static final List<String> FORMER_BUILT_IN_FILTERS = List.of(
        "Source:CAM / TS=/cam|ts/",
        "Source:TV=hdtv",
        "Source:WEB=/webrip|web-dl|webdl/",
        "Source:DVD=dvd",
        "Source:Blu-Ray=/bluray|blu-ray/",
        "Resolution:480p=480p",
        "Resolution:720p=720p",
        "Resolution:1080p=1080p",
        "Resolution:2160p=2160p",
        "Other:3D=3d",
        "Other:x265=x265",
        "Other:HEVC=hevc");

    private final ConfigMigrationStep026to027 testee = new ConfigMigrationStep026to027();

    private static Map<String, Object> config(List<String> customFilters, List<String> preselected) {
        final Map<String, Object> searching = new HashMap<>();
        searching.put("customQuickFilterButtons", new ArrayList<>(customFilters));
        searching.put("preselectQuickFilterButtons", new ArrayList<>(preselected));
        final Map<String, Object> map = new HashMap<>();
        map.put("searching", searching);
        return map;
    }

    @SuppressWarnings("unchecked")
    private static List<String> list(Map<String, Object> map, String key) {
        return (List<String>) ((Map<String, Object>) map.get("searching")).get(key);
    }

    @Test
    void shouldPutFormerBuiltInFiltersInFrontOfExistingCustomFilters() {
        final Map<String, Object> result = testee.migrate(config(List.of("German=german", "Remux=remux"), List.of()));

        final List<String> expected = new ArrayList<>(FORMER_BUILT_IN_FILTERS);
        expected.add("German=german");
        expected.add("Remux=remux");
        assertThat(list(result, "customQuickFilterButtons")).isEqualTo(expected);
    }

    @Test
    void shouldNotAddAFormerBuiltInFilterWhoseNameIsAlreadyUsed() {
        final Map<String, Object> result = testee.migrate(config(List.of("Source:WEB=web"), List.of()));

        assertThat(list(result, "customQuickFilterButtons"))
            .containsOnlyOnce("Source:WEB=web")
            .doesNotContain("Source:WEB=/webrip|web-dl|webdl/")
            .hasSize(FORMER_BUILT_IN_FILTERS.size());
    }

    @Test
    void shouldRewritePreselectedBuiltInFiltersAndKeepCustomOnes() {
        final Map<String, Object> result = testee.migrate(config(List.of("German=german"),
            List.of("source|web", "quality|q1080p", "other|qx265", "other|x265", "other|qhevc", "custom|German")));

        assertThat(list(result, "preselectQuickFilterButtons")).containsExactly(
            "custom|Source:WEB", "custom|Resolution:1080p", "custom|Other:x265", "custom|Other:HEVC", "custom|German");
    }

    @Test
    void shouldHandleMissingLists() {
        final Map<String, Object> map = new HashMap<>();
        map.put("searching", new HashMap<>());

        final Map<String, Object> result = testee.migrate(map);

        assertThat(list(result, "customQuickFilterButtons")).isEqualTo(FORMER_BUILT_IN_FILTERS);
        assertThat(list(result, "preselectQuickFilterButtons")).isEmpty();
    }

    @Test
    void shouldBeForVersion26() {
        assertThat(testee.forVersion()).isEqualTo(26);
    }
}
