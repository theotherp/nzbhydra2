

package org.nzbhydra;

import jakarta.annotation.PostConstruct;
import org.jetbrains.annotations.NotNull;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.condition.DisabledOnOs;
import org.junit.jupiter.api.condition.OS;
import org.nzbhydra.externaltools.AddRequest;
import org.nzbhydra.hydraconfigure.ConfigManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import tools.jackson.core.type.TypeReference;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Configuring Sonarr and Radarr from Hydra, end to end against the real Arr containers.
 *
 * <p>Skipped, not failed, when those containers are not there. A Hydra+mockserver-only run has no Sonarr and no Radarr,
 * and a class that asserts against them reports a wall of connection errors that look like product failures; the
 * assumption in {@code @BeforeAll} turns that into a skip that says why.
 *
 * <p>The indexers this class creates live inside the Arrs, where nothing Hydra does can clean them up, so they carry a
 * prefix unique to this run and are removed by that prefix before and after every test. Before as well as after,
 * because a run that died mid-test leaves them behind and a stale indexer of the same name makes the next run's
 * "created exactly one" assertion read false.
 */
@SystemTest
//Test requires access from external tool (insider docker) to nzbhydra which doesn't work on WSL
@DisabledOnOs(OS.WINDOWS)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class ExternalToolsTest {

    private static final String EXTERNAL_TOOL_API_KEY = "system-test-api-key-12345";
    private static final String TEST_PREFIX = "ExternalToolsTest-";

    private static final Logger logger = LoggerFactory.getLogger(ExternalToolsTest.class);

    @Autowired
    private HydraClient hydraClient;

    @Autowired
    private ConfigManager configManager;

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

    private String testName;

    @PostConstruct
    public void log() {
        logger.info("Using sonarr host: {}, radarr host: {}, nzbhydra external host: {}", sonarrHost, radarrHost, nzbhydraHostExternal);
    }

    @BeforeAll
    public void abortWhenArrIsNotReady() {
        Assumptions.assumeTrue(isArrReady(sonarrHostExternal), "Sonarr is not ready");
        Assumptions.assumeTrue(isArrReady(radarrHostExternal), "Radarr is not ready");
    }

    @BeforeEach
    public void nameAndCleanOwnedIndexers() {
        testName = TEST_PREFIX + UUID.randomUUID();
        removeOwnedIndexers(sonarrHostExternal);
        removeOwnedIndexers(radarrHostExternal);
    }

    @AfterEach
    public void cleanOwnedIndexers() {
        removeOwnedIndexers(sonarrHostExternal);
        removeOwnedIndexers(radarrHostExternal);
    }

    @Test
    public void shouldAddToSonar() throws Exception {
        AddRequest addRequest = new AddRequest();
        addRequest.setConfigureForUsenet(true);
        addRequest.setNzbhydraName(testName);
        addRequest.setExternalTool(AddRequest.ExternalTool.Sonarr);
        addRequest.setXdarrHost(sonarrHost);
        addRequest.setXdarrApiKey(EXTERNAL_TOOL_API_KEY);
        addRequest.setNzbhydraHost(nzbhydraHostExternal);
        addRequest.setEnableRss(true);
        addRequest.setEnableInteractiveSearch(true);
        addRequest.setCategories(getIdFromConfiguredIndexer());
        addRequest.setAddType(AddRequest.AddType.SINGLE);
        addRequest.setPriority(1);

        final Boolean response = hydraClient.post("/internalapi/externalTools/configure", Jackson.JSON_MAPPER.writeValueAsString(addRequest)).as(Boolean.class);
        assertConfigurationSucceeded(response);
        assertThat(indexersNamed(sonarrHostExternal, testName)).hasSize(1);
    }

    @Test
    public void shouldAddToRadarr() throws Exception {
        AddRequest addRequest = new AddRequest();
        addRequest.setConfigureForUsenet(true);
        addRequest.setNzbhydraName(testName);
        addRequest.setExternalTool(AddRequest.ExternalTool.Radarr);
        addRequest.setXdarrHost(radarrHost);
        addRequest.setXdarrApiKey(EXTERNAL_TOOL_API_KEY);
        addRequest.setNzbhydraHost(nzbhydraHostExternal);
        addRequest.setEnableRss(true);
        addRequest.setEnableInteractiveSearch(true);
        addRequest.setCategories(getIdFromConfiguredIndexer());
        addRequest.setAddType(AddRequest.AddType.SINGLE);
        addRequest.setPriority(1);

        final Boolean response = hydraClient.post("/internalapi/externalTools/configure", Jackson.JSON_MAPPER.writeValueAsString(addRequest)).as(Boolean.class);
        assertConfigurationSucceeded(response);
        assertThat(indexersNamed(radarrHostExternal, testName)).hasSize(1);
    }

    @NotNull
    private String getIdFromConfiguredIndexer() {
        return String.valueOf(configManager.getCurrentConfig().getIndexers().get(0).getCategoryMapping().getCategories().get(0).getId());
    }

    private void assertConfigurationSucceeded(Boolean response) throws Exception {
        List<String> messages = hydraClient.get("/internalapi/externalTools/messages").as(new TypeReference<>() {
        });
        assertThat(response).as("Configuration messages: %s", messages).isTrue();
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

    private List<ArrIndexer> getIndexers(String host) {
        HydraResponse response = getIndexersResponse(host);
        assertThat(response.status()).isEqualTo(200);
        return response.as(new TypeReference<>() {
        });
    }

    private List<ArrIndexer> indexersNamed(String host, String name) {
        return getIndexers(host).stream().filter(indexer -> name.equals(indexer.name)).toList();
    }

    private void removeOwnedIndexers(String host) {
        List<ArrIndexer> ownedIndexers = getIndexers(host).stream()
                .filter(indexer -> indexer.name != null && indexer.name.startsWith(TEST_PREFIX))
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

    public static class ArrIndexer {
        public int id;
        public String name;
    }
}
