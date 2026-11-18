package org.nzbhydra.database;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DatabaseStatisticsTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @InjectMocks
    private DatabaseStatistics testee;

    private Map<String, Object> row(String name, String value) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("SETTING_NAME", name);
        row.put("SETTING_VALUE", value);
        return row;
    }

    @Test
    void shouldReturnInfoSettingsSortedByName() {
        when(jdbcTemplate.queryForList(anyString())).thenReturn(List.of(
            row("info.PAGE_COUNT", "100"),
            row("info.FILL_RATE", "80"),
            row("info.CHUNK_COUNT", "5")
        ));

        Map<String, String> result = testee.getInfoSettings();

        assertThat(result).containsExactly(
            Map.entry("info.CHUNK_COUNT", "5"),
            Map.entry("info.FILL_RATE", "80"),
            Map.entry("info.PAGE_COUNT", "100")
        );
    }

    @Test
    void shouldReturnEmptyMapWhenQueryFails() {
        when(jdbcTemplate.queryForList(anyString())).thenThrow(new RuntimeException("boom"));

        Map<String, String> result = testee.getInfoSettings();

        assertThat(result).isEmpty();
    }

    @Test
    void shouldBuildSortedSummaryLine() {
        when(jdbcTemplate.queryForList(anyString())).thenReturn(List.of(
            row("info.PAGE_COUNT", "100"),
            row("info.FILL_RATE", "80")
        ));

        String summaryLine = testee.getSummaryLine();

        assertThat(summaryLine).isEqualTo("H2 database statistics: info.FILL_RATE = 80, info.PAGE_COUNT = 100");
    }

    @Test
    void shouldNotThrowWhenLoggingStatisticsOnStartup() {
        when(jdbcTemplate.queryForList(anyString())).thenReturn(List.of(
            row("info.FILL_RATE", "10")
        ));

        assertThatCode(() -> testee.logStatisticsOnStartup()).doesNotThrowAnyException();
    }

    private void returnVersions(long currentVersion, long oldestVersion) {
        when(jdbcTemplate.queryForList(contains("INFORMATION_SCHEMA.SETTINGS"))).thenReturn(List.of(
            row("info.CURRENT_VERSION", String.valueOf(currentVersion)),
            row("info.OLDEST_VERS_TO_KEEP", String.valueOf(oldestVersion)),
            row("info.FILL_RATE", "50")
        ));
    }

    @Test
    void shouldWarnWithActiveSessionsWhenOldestVersionIsPinned() {
        Instant start = Instant.parse("2026-11-18T10:00:00Z");
        when(jdbcTemplate.queryForList(contains("INFORMATION_SCHEMA.SESSIONS"))).thenReturn(List.of());
        returnVersions(1000, 1000);
        testee.sample(start);
        returnVersions(2000, 1000);

        VersionPinningTracker.Status status = testee.sample(start.plus(Duration.ofMinutes(6)));

        assertThat(status.state()).isEqualTo(VersionPinningTracker.State.PINNED_WARN);
        assertThat(status.versionsBehind()).isEqualTo(1000);
        verify(jdbcTemplate).queryForList(contains("INFORMATION_SCHEMA.SESSIONS"));
    }

    @Test
    void shouldNotQuerySessionsWhileOldestVersionAdvances() {
        Instant start = Instant.parse("2026-11-18T10:00:00Z");
        returnVersions(1000, 1000);
        testee.sample(start);
        returnVersions(2000, 1999);

        VersionPinningTracker.Status status = testee.sample(start.plus(Duration.ofMinutes(6)));

        assertThat(status.state()).isEqualTo(VersionPinningTracker.State.NOT_PINNED);
        verify(jdbcTemplate, never()).queryForList(contains("INFORMATION_SCHEMA.SESSIONS"));
    }

    @Test
    void shouldSkipSampleWithoutVersionStatistics() {
        when(jdbcTemplate.queryForList(anyString())).thenReturn(List.of(row("info.FILL_RATE", "50")));

        assertThat(testee.sample(Instant.now())).isNull();
    }
}
