

package org.nzbhydra;

import jakarta.annotation.PostConstruct;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.hydraconfigure.ConfigManager;
import org.nzbhydra.hydraconfigure.DownloaderConfigurer;
import org.nzbhydra.hydraconfigure.IndexerConfigurer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class BeforeAll {

    private static final Logger logger = LoggerFactory.getLogger(BeforeAll.class);

    @Autowired
    private ConfigManager configManager;
    @Autowired
    private IndexerConfigurer indexerConfigurer;
    @Autowired
    private DownloaderConfigurer downloaderConfigurer;

    @Autowired
    private ConfigurableEnvironment configurableEnvironment;

    @PostConstruct
    public void init() throws Exception {
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

        applyBaseline();
    }

    /**
     * Writes the configuration every system test is entitled to assume: the shared API key, the logging flags, the
     * mock indexers and the mock SABnzbd downloader.
     *
     * <p>Call this from a test's own {@code @BeforeEach} when the test needs that baseline. Establishing a
     * precondition is the test's job; inheriting it from whichever test happened to run first is not. The suite used
     * to rely on this running once in {@link #init()} and on every config-mutating test putting back what it found,
     * which made a single failure cascade into unrelated ones - a test that replaced the indexers and then failed left
     * the next test searching against an indexer list it never chose.
     *
     * <p>Restoring a captured snapshot is not a substitute. {@code GET /internalapi/config} masks secrets as
     * {@code ***UNCHANGED***}, and since FM-068 a save is refused when such a marker cannot be matched to a stored
     * record - which is exactly the case after the records it came from have been replaced. Re-applying a known
     * baseline with real secrets always works; putting back a masked snapshot does not.
     */
    public void applyBaseline() {
        final BaseConfig config = configManager.getCurrentConfig();
        config.getMain().setApiKey("apikey");
        config.getMain().getLogging().setLogIpAddresses(true);
        config.getMain().getLogging().setLogUsername(true);
        configManager.setConfig(config);
        indexerConfigurer.configureTwoMockIndexers();
        downloaderConfigurer.configureSabnzbdMock();
    }
}
