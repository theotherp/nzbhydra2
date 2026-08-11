package org.nzbhydra;

import org.awaitility.Awaitility;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.condition.EnabledOnOs;
import org.junit.jupiter.api.condition.OS;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ExternalToolConfig;
import org.nzbhydra.config.validation.ConfigValidationResult;
import org.nzbhydra.externaltools.AddRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ContextConfiguration;
import tools.jackson.core.type.TypeReference;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ContextConfiguration(classes = {TestConfig.class})
@EnabledOnOs(OS.LINUX)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class ExternalToolsLifecycleSystemTest {

    private static final String EXTERNAL_TOOL_API_KEY = "system-test-api-key-12345";
    private static final String REDACTED_API_KEY = "********";
    private static final String TEST_PREFIX = "ExternalToolsLifecycleSystemTest-";

    @Autowired
    private HydraClient hydraClient;

    @Value("${sonarr.host}")
    private String sonarrHost;

    @Value("${radarr.host}")
    private String radarrHost;

    @Value("${sonarr.host.external}")
    private String sonarrHostExternal;

    @Value("${radarr.host.external}")
    private String radarrHostExternal;

    @Value("${nzbhydra.host.external}")
    private String nzbhydraHostExternal;

    private BaseConfig originalConfig;
    private String testName;

    @BeforeAll
    public void abortWhenArrIsNotReady() {
        Assumptions.assumeTrue(isArrReady(sonarrHostExternal), "Sonarr is not ready");
        Assumptions.assumeTrue(isArrReady(radarrHostExternal), "Radarr is not ready");
    }

    @BeforeEach
    public void setUp() {
        originalConfig = getConfig();
        testName = TEST_PREFIX + UUID.randomUUID();
        removeOwnedIndexers(sonarrHostExternal);
        removeOwnedIndexers(radarrHostExternal);
    }

    @AfterEach
    public void tearDown() {
        try {
            if (originalConfig != null) {
                saveConfig(originalConfig);
            }
        } finally {
            removeOwnedIndexers(sonarrHostExternal);
            removeOwnedIndexers(radarrHostExternal);
        }
    }

    @Test
    public void shouldCreateCorrectSonarrIndexerConfiguration() {
        AddRequest request = createRequest(AddRequest.ExternalTool.Sonarr, sonarrHost, "5030,5040", 17, true, false, true);

        assertConfigurationSucceeded(request);

        ArrIndexer indexer = awaitIndexer(sonarrHostExternal, testName);
        assertIndexerConfiguration(indexer, "Newznab", "usenet", "5030,5040", 17, true, false, true);
    }

    @Test
    public void shouldCreateCorrectRadarrIndexerConfiguration() {
        AddRequest request = createRequest(AddRequest.ExternalTool.Radarr, radarrHost, "2000,2040", 31, false, true, false);
        request.setRemoveYearFromSearchString(true);

        assertConfigurationSucceeded(request);

        ArrIndexer indexer = awaitIndexer(radarrHostExternal, testName);
        assertIndexerConfiguration(indexer, "Newznab", "usenet", "2000,2040", 31, false, true, false);
        assertThat(indexer.fieldsByName()).containsEntry("removeYear", true);
    }

    @Test
    public void shouldReconfigureWithoutCreatingDuplicates() {
        AddRequest request = createRequest(AddRequest.ExternalTool.Sonarr, sonarrHost, "5030", 23, false, true, true);

        assertConfigurationSucceeded(request);
        assertConfigurationSucceeded(request);

        assertThat(indexersNamed(sonarrHostExternal, testName)).hasSize(1);
    }

    @Test
    public void shouldSynchronizeChangedIndexerConfiguration() {
        BaseConfig config = getConfig();
        String indexerName = config.getIndexers().get(0).getName();
        String initialApiKey = config.getIndexers().get(0).getApiKey();
        int initialScore = 12;
        int changedScore = 31;
        config.getIndexers().get(0).setApiKey(initialApiKey + "-initial-synchronization");
        config.getIndexers().get(0).setScore(initialScore);
        config.getExternalTools().setSyncOnConfigChange(true);
        config.getExternalTools().setExternalTools(List.of(externalToolConfig()));
        saveConfig(config);

        String synchronizedName = testName + " (" + indexerName + ")";
        Awaitility.await().atMost(Duration.ofSeconds(15)).untilAsserted(() ->
                assertThat(awaitIndexer(sonarrHostExternal, synchronizedName).priority).isEqualTo(priorityForScore(initialScore)));

        config = getConfig();
        config.getIndexers().stream()
                .filter(indexer -> indexerName.equals(indexer.getName()))
                .findFirst()
                .orElseThrow()
                .setApiKey(initialApiKey + "-synchronized");
        config.getIndexers().stream()
                .filter(indexer -> indexerName.equals(indexer.getName()))
                .findFirst()
                .orElseThrow()
                .setScore(changedScore);
        saveConfig(config);

        Awaitility.await().atMost(Duration.ofSeconds(15)).untilAsserted(() -> {
            assertThat(awaitIndexer(sonarrHostExternal, synchronizedName).priority).isEqualTo(priorityForScore(changedScore));
            assertThat(indexersNamed(sonarrHostExternal, synchronizedName)).hasSize(1);
        });
    }

    @Test
    public void shouldReportInvalidExternalToolCredentials() {
        AddRequest request = createRequest(AddRequest.ExternalTool.Sonarr, sonarrHost, "5030", 19, true, true, false);
        request.setXdarrApiKey("invalid-system-test-api-key");

        HydraResponse response = hydraClient.post("/internalapi/externalTools/configure", request);
        assertThat(response.status()).isEqualTo(200);
        Boolean configured = response.as(Boolean.class);
        List<String> messages = configurationMessages();

        assertThat(configured).as("Configuration messages: %s", messages).isFalse();
        assertThat(messages).anySatisfy(message -> assertThat(message.toLowerCase())
                .containsAnyOf("unauthorized", "authorization", "api key", "401"));
        assertThat(indexersNamed(sonarrHostExternal, testName)).isEmpty();
    }

    private AddRequest createRequest(AddRequest.ExternalTool tool, String host, String categories, int priority,
                                     boolean enableRss, boolean enableAutomaticSearch, boolean enableInteractiveSearch) {
        AddRequest request = new AddRequest();
        request.setConfigureForUsenet(true);
        request.setExternalTool(tool);
        request.setXdarrHost(host);
        request.setXdarrApiKey(EXTERNAL_TOOL_API_KEY);
        request.setNzbhydraHost(nzbhydraHostExternal);
        request.setNzbhydraName(testName);
        request.setCategories(categories);
        request.setAddType(AddRequest.AddType.SINGLE);
        request.setPriority(priority);
        request.setEnableRss(enableRss);
        request.setEnableAutomaticSearch(enableAutomaticSearch);
        request.setEnableInteractiveSearch(enableInteractiveSearch);
        return request;
    }

    private ExternalToolConfig externalToolConfig() {
        ExternalToolConfig tool = new ExternalToolConfig();
        tool.setName(testName);
        tool.setType(ExternalToolConfig.ExternalToolType.SONARR);
        tool.setHost(sonarrHost);
        tool.setApiKey(EXTERNAL_TOOL_API_KEY);
        tool.setNzbhydraHost(nzbhydraHostExternal);
        tool.setNzbhydraName(testName);
        tool.setSyncType(ExternalToolConfig.SyncType.PER_INDEXER);
        tool.setConfigureForUsenet(true);
        tool.setUseHydraPriorities(true);
        tool.setEnableRss(true);
        tool.setEnableAutomaticSearch(true);
        tool.setEnableInteractiveSearch(true);
        tool.setCategories("5030");
        return tool;
    }

    private void assertConfigurationSucceeded(AddRequest request) {
        HydraResponse response = hydraClient.post("/internalapi/externalTools/configure", request);
        assertThat(response.status()).isEqualTo(200);
        Boolean configured = response.as(Boolean.class);
        List<String> messages = configurationMessages();
        assertThat(configured).as("Configuration messages: %s", messages).isTrue();
    }

    private List<String> configurationMessages() {
        HydraResponse response = hydraClient.get("/internalapi/externalTools/messages");
        assertThat(response.status()).isEqualTo(200);
        return response.as(new TypeReference<>() {
        });
    }

    private void assertIndexerConfiguration(ArrIndexer indexer, String implementation, String protocol, String categories,
                                            int priority, boolean enableRss, boolean enableAutomaticSearch,
                                            boolean enableInteractiveSearch) {
        assertThat(indexer.implementation).isEqualTo(implementation);
        assertThat(indexer.protocol).isEqualTo(protocol);
        assertThat(indexer.priority).isEqualTo(priority);
        assertThat(indexer.enableRss).isEqualTo(enableRss);
        assertThat(indexer.enableAutomaticSearch).isEqualTo(enableAutomaticSearch);
        assertThat(indexer.enableInteractiveSearch).isEqualTo(enableInteractiveSearch);
        assertThat(indexer.fieldsByName())
                .containsEntry("baseUrl", nzbhydraHostExternal)
                // Arr APIs redact persisted indexer API keys in their response.
                .containsEntry("apiKey", REDACTED_API_KEY);
        assertThat(categoryValues(indexer.fieldsByName().get("categories")))
                .containsExactlyElementsOf(expectedCategoryValues(categories));
    }

    private ArrIndexer awaitIndexer(String host, String name) {
        Awaitility.await().atMost(Duration.ofSeconds(15)).untilAsserted(() -> assertThat(indexersNamed(host, name)).hasSize(1));
        return indexersNamed(host, name).get(0);
    }

    private List<ArrIndexer> indexersNamed(String host, String name) {
        return getIndexers(host).stream().filter(indexer -> name.equals(indexer.name)).toList();
    }

    private List<ArrIndexer> getIndexers(String host) {
        HydraResponse response = getIndexersResponse(host);
        assertThat(response.status()).isEqualTo(200);
        return response.as(new TypeReference<>() {
        });
    }

    private boolean isArrReady(String host) {
        try {
            return getIndexersResponse(host).dontRaiseIfUnsuccessful().status() == 200;
        } catch (RuntimeException e) {
            return false;
        }
    }

    private HydraResponse getIndexersResponse(String host) {
        return hydraClient.get(host + "/api/v3/indexer", apiHeaders());
    }

    private void removeOwnedIndexers(String host) {
        List<ArrIndexer> ownedIndexers = getIndexers(host).stream()
                .filter(indexer -> indexer.name.startsWith(TEST_PREFIX))
                .toList();
        List<String> failures = new ArrayList<>();
        for (ArrIndexer indexer : ownedIndexers) {
            HydraResponse response = hydraClient.delete(host + "/api/v3/indexer/" + indexer.id, apiHeaders())
                    .dontRaiseIfUnsuccessful();
            if (response.status() != 200 && response.status() != 204) {
                failures.add(indexer.name + " (HTTP " + response.status() + "): " + response.body());
            }
        }
        assertThat(failures).as("Failed to remove test-owned external indexers").isEmpty();
    }

    private Map<String, String> apiHeaders() {
        return Map.of("X-Api-Key", EXTERNAL_TOOL_API_KEY);
    }

    private BaseConfig getConfig() {
        HydraResponse response = hydraClient.get("/internalapi/config");
        assertThat(response.status()).isEqualTo(200);
        return response.as(BaseConfig.class);
    }

    private void saveConfig(BaseConfig config) {
        HydraResponse response = hydraClient.put("/internalapi/config", config);
        assertThat(response.status()).isEqualTo(200);
        ConfigValidationResult result = response.as(ConfigValidationResult.class);
        assertThat(result.isOk()).as("Configuration errors: %s", result.getErrorMessages()).isTrue();
    }

    private int priorityForScore(int score) {
        return Math.max(50 - score, 1);
    }

    private List<Integer> categoryValues(Object values) {
        return ((List<?>) values).stream().map(value -> ((Number) value).intValue()).collect(Collectors.toList());
    }

    private List<Integer> expectedCategoryValues(String categories) {
        return java.util.stream.Stream.of(categories.split(",")).map(Integer::valueOf).toList();
    }

    public static class ArrIndexer {
        public int id;
        public String name;
        public String implementation;
        public String protocol;
        public int priority;
        public Boolean enableRss;
        public Boolean enableAutomaticSearch;
        public Boolean enableInteractiveSearch;
        public List<ArrIndexerField> fields;

        public Map<String, Object> fieldsByName() {
            Map<String, Object> fieldsByName = new LinkedHashMap<>();
            fields.forEach(field -> fieldsByName.put(field.name, field.value));
            return fieldsByName;
        }
    }

    public static class ArrIndexerField {
        public String name;
        public Object value;
    }
}
