package org.nzbhydra.debuginfos;

import org.apache.commons.lang3.tuple.Pair;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.nzbhydra.Jackson;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.ExternalToolConfig;
import org.nzbhydra.config.auth.UserAuthConfig;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.logging.LogAnonymizer;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
public class DebugInfosProviderTest {

    @Mock
    private ConfigProvider configProviderMock;

    private final LogAnonymizer logAnonymizer = new LogAnonymizer();

    @InjectMocks
    private DebugInfosProvider testee;

    private BaseConfig baseConfig;

    @BeforeEach
    public void setUp() {
        baseConfig = new BaseConfig();
        lenient().when(configProviderMock.getBaseConfig()).thenReturn(baseConfig);
        ReflectionTestUtils.setField(logAnonymizer, "configProvider", configProviderMock);
        ReflectionTestUtils.setField(testee, "logAnonymizer", logAnonymizer);
    }

    @Test
    void shouldRemoveUsernamesFromGenericStorageKeys() throws Exception {
        //Users logged in via OIDC are not in the config, so their names must be removed without knowing them
        baseConfig.getGenericStorage().put("shownUserNews-TheKnick", "{\"ids\":[\"categoriesHint\"]}");
        baseConfig.getGenericStorage().put("guidedTourHidden-John-Doe", "true");
        baseConfig.getGenericStorage().put("FirstStart", "[2019,8,12]");

        String config = testee.getAnonymizedConfig();

        assertThat(config)
                .doesNotContain("TheKnick")
                .doesNotContain("John-Doe")
                .contains("shownUserNews-" + logAnonymizer.anonymizeUsername("TheKnick"))
                .contains("guidedTourHidden-" + logAnonymizer.anonymizeUsername("John-Doe"))
                .contains("categoriesHint")
                .contains("FirstStart");
    }

    @Test
    void shouldRemoveValuesIdentifyingTheUser() throws Exception {
        UserAuthConfig user = new UserAuthConfig();
        user.setUsername("someuser");
        baseConfig.getAuth().getUsers().add(user);
        baseConfig.getAuth().setOidcIssuerUri("https://auth.mydomain.net/application/o/nzbhydra2/");
        baseConfig.getAuth().setOidcClientId("DUEVc0L9xa3qlbyVPY7ezME7dQr9fttlNVhEKsDk");
        baseConfig.getAuth().getAuthHeaderIpRanges().add("93.184.216.34");
        baseConfig.getDownloading().setExternalUrl("https://hydra.mydomain.net");
        baseConfig.getEmby().setEmbyBaseUrl("http://emby.mydomain.net");
        baseConfig.getEmby().setEmbyApiKey("embyapikey");
        ExternalToolConfig externalTool = new ExternalToolConfig();
        externalTool.setHost("http://sonarr.mydomain.net");
        externalTool.setNzbhydraHost("http://hydra.internal.net");
        baseConfig.getExternalTools().getExternalTools().add(externalTool);
        IndexerConfig indexerConfig = new IndexerConfig();
        indexerConfig.setHost("https://indexer.com");
        indexerConfig.getCustomParameters().add("secret=abcdef");
        indexerConfig.getCustomParameters().add("other=ghijkl");
        baseConfig.getIndexers().add(indexerConfig);

        String config = testee.getAnonymizedConfig();

        assertThat(config)
                .doesNotContain("someuser")
                .doesNotContain("mydomain.net")
                .doesNotContain("DUEVc0L9xa3qlbyVPY7ezME7dQr9fttlNVhEKsDk")
                .doesNotContain("93.184.216.34")
                .doesNotContain("embyapikey")
                .doesNotContain("hydra.internal.net")
                .doesNotContain("abcdef")
                .doesNotContain("ghijkl")
                //Indexer hosts are no secret and useful for debugging, the address to bind to does not identify anybody
                .contains("https://indexer.com")
                .contains("host: \"0.0.0.0\"");

        //The config diff in the debug infos is built from the anonymized config
        BaseConfig readConfig = Jackson.YAML_MAPPER.readValue(config, BaseConfig.class);
        assertThat(readConfig.getIndexers().get(0).getCustomParameters()).containsExactly("<REMOVED>", "<REMOVED>");
        assertThat(readConfig.getAuth().getAuthHeaderIpRanges()).hasSize(1).allMatch(x -> x.startsWith("<IP4:"));
        assertThat(readConfig.getAuth().getOidcIssuerUri()).isEqualTo("<REMOVED>");
    }

    @Test
    void shouldForgetCpuTimesOfEndedThreads() {
        testee.recordThreadCpuUsages(List.of(Pair.of("pool-1-thread-1", 1_000_000L), Pair.of("main", 1_000_000L)), 5000, 1);
        testee.recordThreadCpuUsages(List.of(Pair.of("main", 2_000_000L)), 5000, 1);

        @SuppressWarnings("unchecked")
        Map<String, Long> lastThreadCpuTimes = (Map<String, Long>) ReflectionTestUtils.getField(testee, "lastThreadCpuTimes");
        assertThat(lastThreadCpuTimes).containsOnlyKeys("main").containsEntry("main", 2_000_000L);

        //A thread reusing an ended thread's name starts fresh instead of being compared to the old thread's CPU time
        testee.recordThreadCpuUsages(List.of(Pair.of("main", 3_000_000L), Pair.of("pool-1-thread-1", 500L)), 5000, 1);
        List<DebugInfosProvider.TimeAndThreadCpuUsages> chartData = testee.getThreadCpuUsageChartData();
        assertThat(chartData.get(2).getThreadCpuUsages()).extracting(DebugInfosProvider.ThreadCpuUsage::getThreadName).containsExactly("main");
    }

    @Test
    void shouldComputeThreadCpuUsageAndReturnCopyOfChartData() {
        //50 ms of CPU time over 5000 ms on one CPU: 50_000_000 ns / (5000 * 1000 * 1) = 10
        testee.recordThreadCpuUsages(List.of(Pair.of("main", 0L)), 5000, 1);
        testee.recordThreadCpuUsages(List.of(Pair.of("main", 50_000_000L)), 5000, 1);

        List<DebugInfosProvider.TimeAndThreadCpuUsages> chartData = testee.getThreadCpuUsageChartData();
        assertThat(chartData).hasSize(2);
        assertThat(chartData.get(0).getThreadCpuUsages()).isEmpty();
        assertThat(chartData.get(1).getThreadCpuUsages()).containsExactly(new DebugInfosProvider.ThreadCpuUsage("main", 10));

        chartData.clear();
        assertThat(testee.getThreadCpuUsageChartData()).hasSize(2);
    }

    @Test
    void shouldKeepAtMost49ChartDataPoints() {
        for (int i = 0; i < 60; i++) {
            testee.recordThreadCpuUsages(List.of(Pair.of("main", (long) i)), 5000, 1);
        }

        assertThat(testee.getThreadCpuUsageChartData()).hasSize(49);
    }

    @Test
    void shouldStopMetricsExecutorOnShutdown() {
        ScheduledExecutorService executor = Executors.newSingleThreadScheduledExecutor();
        ReflectionTestUtils.setField(testee, "metricsExecutor", executor);

        testee.stopMetricsLogging();

        assertThat(executor.isShutdown()).isTrue();
    }

    @Test
    void shouldNotFailOnShutdownWhenMetricsAreNotLogged() {
        testee.logMetrics();

        testee.stopMetricsLogging();

        assertThat(ReflectionTestUtils.getField(testee, "metricsExecutor")).isNull();
    }
}
