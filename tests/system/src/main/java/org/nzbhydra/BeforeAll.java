

package org.nzbhydra;

import jakarta.annotation.PostConstruct;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.MainConfig;
import org.nzbhydra.config.validation.ConfigValidationResult;
import org.nzbhydra.hydraconfigure.ConfigManager;
import org.nzbhydra.hydraconfigure.DownloaderConfigurer;
import org.nzbhydra.hydraconfigure.IndexerConfigurer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class BeforeAll {

    /**
     * The external API key every test's {@code /api} call passes and the Playwright suite assumes.
     */
    public static final String API_KEY = "apikey";

    /**
     * {@code searching.userAgent} as {@code config/baseConfig.yml} ships it.
     */
    private static final String DEFAULT_USER_AGENT = "NZBHydra2";

    private static final Logger logger = LoggerFactory.getLogger(BeforeAll.class);

    @Autowired
    private ConfigManager configManager;
    @Autowired
    private IndexerConfigurer indexerConfigurer;
    @Autowired
    private DownloaderConfigurer downloaderConfigurer;
    @Autowired
    private HydraClient hydraClient;

    @Autowired
    private ConfigurableEnvironment configurableEnvironment;

    /**
     * The configuration as {@code GET /internalapi/config} returned it immediately after the last baseline write, and
     * the number of mutating requests this client had made at that moment. Together they answer "is the instance still
     * where the last baseline write left it?" without a write of its own.
     */
    private String configAfterLastBaselineWrite;
    private long mutatingRequestsAtLastBaselineWrite = -1;

    @PostConstruct
    public void init() {
        final List<MapPropertySource> propertySources = configurableEnvironment.getPropertySources()
            .stream()
            .filter(x -> x instanceof MapPropertySource)
            .map(x -> (MapPropertySource) x).toList();
        for (MapPropertySource source : propertySources) {
            logger.info("Property source: {}", source.getName());
            source.getSource().forEach((key, value) -> {
                if (source.getName().equals("systemEnvironment") && key.startsWith("INPUT_")) {
                    return;
                }
                logger.info("{}: {}", key, value);
            });
        }
    }

    /**
     * Writes the configuration every system test is entitled to assume: the shared API key, the logging flags, the
     * mock indexers, the mock SABnzbd downloader, and the handful of plain settings the suite is known to toggle
     * ({@code showNews}, {@code disableTour}, the blackhole folders, the user agent, the notification entries).
     *
     * <p>{@code BaselineExtension} calls this before every test and after every class, so establishing the baseline is
     * a property of the test rather than of the JVM fork that happened to build the Spring context first. It used to
     * run once from {@link #init()}; whichever class was scheduled first paid for it and every later class inherited
     * whatever its predecessors had left behind, which is why a single failure cascaded into unrelated ones.
     *
     * <p>Restoring a captured snapshot is not a substitute (ADR-0020). {@code GET /internalapi/config} masks secrets as
     * {@code ***UNCHANGED***}, and since FM-068 a save is refused when such a marker cannot be matched to a stored
     * record - which is exactly the case after the records it came from have been replaced. Re-applying a known
     * baseline with real secrets always works; putting back a masked snapshot does not.
     *
     * <p>Deliberately not part of the baseline: {@code auth}. The {@code v1Migration} fixture boots with basic auth
     * configured and {@code AuthLoginTest} reads it, so a shared baseline may not overwrite it. The class that changes
     * authentication ({@code AuthorizationSystemTest}) establishes the state it wants and puts back the checked-in
     * default itself.
     *
     * <p>The call is cheap when nothing has changed: it re-reads the configuration and writes only if the instance has
     * drifted from where the last baseline write left it. Writing unconditionally would re-send the indexer list on
     * every test, and a changed indexer costs seconds.
     */
    public void applyBaseline() {
        if (isStillAtBaseline()) {
            logger.debug("Instance is still at the baseline this client last wrote; not writing it again");
            return;
        }
        writeBaseline();
    }

    /**
     * True when the instance cannot have moved since the last baseline write: this client has made no mutating request
     * since, and the configuration reads back byte-identical.
     *
     * <p>Both halves are needed. The request count alone misses server-side writes - an indexer the core disables after
     * repeated failures, or a backup restore, which arrives as a {@code GET}. The configuration comparison alone misses
     * changes to fields {@code GET /internalapi/config} masks, such as an indexer API key: those read back as
     * {@code ***UNCHANGED***} whatever they hold. A test that touches a masked field necessarily made a mutating
     * request, so the count catches what the comparison cannot.
     */
    private boolean isStillAtBaseline() {
        if (configAfterLastBaselineWrite == null) {
            return false;
        }
        if (hydraClient.mutatingRequestCount() != mutatingRequestsAtLastBaselineWrite) {
            return false;
        }
        return configAfterLastBaselineWrite.equals(currentConfigJson());
    }

    private void writeBaseline() {
        final BaseConfig config = configManager.getCurrentConfig();

        final MainConfig main = config.getMain();
        main.setApiKey(API_KEY);
        main.getLogging().setLogIpAddresses(true);
        main.getLogging().setLogUsername(true);
        // The startup news dialog and the tour are what the Playwright phase, one Maven phase later, expects to find
        // (.github/workflows/system-test.yml). FM-134 was a `showNews` left false here.
        main.setShowNews(true);
        main.setDisableTour(false);

        config.getIndexers().clear();
        config.getIndexers().addAll(indexerConfigurer.getMockIndexerConfigs());

        config.getDownloading().setDownloaders(new ArrayList<>(List.of(downloaderConfigurer.getSabnzbdMockConfig())));
        config.getDownloading().setSaveNzbsTo(null);
        config.getDownloading().setSaveTorrentsTo(null);

        config.getSearching().setUserAgent(DEFAULT_USER_AGENT);

        config.getNotificationConfig().setEntries(new ArrayList<>());
        config.getNotificationConfig().setFilterOuts(new ArrayList<>());

        final ConfigValidationResult result = hydraClient.put("/internalapi/config", config).as(ConfigValidationResult.class);
        if (!result.isOk()) {
            throw new IllegalStateException("Unable to establish the system test baseline: " + result.getErrorMessages());
        }

        mutatingRequestsAtLastBaselineWrite = hydraClient.mutatingRequestCount();
        configAfterLastBaselineWrite = currentConfigJson();
    }

    private String currentConfigJson() {
        return hydraClient.get("/internalapi/config").body();
    }
}
