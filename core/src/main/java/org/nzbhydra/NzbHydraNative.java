
package org.nzbhydra;

import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigReaderWriter;
import org.nzbhydra.config.migration.ConfigMigration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.aop.AopAutoConfiguration;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.web.bind.annotation.RestController;

import java.io.File;
import java.io.IOException;
import java.util.Arrays;
import java.util.Map;

/**
 * Slimmed down version of NzbHydra to be used when building a native image.
 */
@Configuration(proxyBeanMethods = false)
@EnableAutoConfiguration(exclude = {
    AopAutoConfiguration.class, org.springframework.boot.autoconfigure.cache.CacheAutoConfiguration.class})
@ComponentScan
@RestController
@EnableCaching
@EnableScheduling
@EnableTransactionManagement
public class NzbHydraNative {

    private static final Logger logger = LoggerFactory.getLogger(NzbHydraNative.class);

    private static final ConfigReaderWriter CONFIG_READER_WRITER = new ConfigReaderWriter();

    public static void main(String[] args) throws Exception {
        if (System.getenv("HYDRA_NATIVE_BUILD") != null) {
            logger.warn("Running for native build");
            System.setProperty("spring.datasource.url", "jdbc:h2:mem:testdb");
            startup(args);
        } else {
            NzbHydra.main(args);
        }
    }

    protected static void startup(String[] args) throws Exception {

        String dataFolder = "./data";
        NzbHydra.setDataFolder(dataFolder);

        System.setProperty("nzbhydra.dataFolder", dataFolder);
        File yamlFile = new File(dataFolder, "nzbhydra.yml");
        initializeAndValidateAndMigrateYamlFile(yamlFile);

        setApplicationPropertiesFromConfig();

        SpringApplication hydraApplication = new SpringApplication(NzbHydraNative.class);
        hydraApplication.run(args);
        logger.info("Native application returned");
    }


    /**
     * Sets all properties referenced in application.properties so that they can be resolved
     */
    private static void setApplicationPropertiesFromConfig() throws IOException {
        BaseConfig baseConfig = CONFIG_READER_WRITER.loadSavedConfig();
        setApplicationProperty("main.host", "MAIN_HOST", baseConfig.getMain().getHost());
        setApplicationProperty("main.port", "MAIN_PORT", String.valueOf(baseConfig.getMain().getPort()));
        setApplicationProperty("main.urlBase", "MAIN_URL_BASE", baseConfig.getMain().getUrlBase().orElse("/"));
        setApplicationProperty("main.logging.consolelevel", "MAIN_LOGGING_CONSOLELEVEL", baseConfig.getMain().getLogging().getConsolelevel());
        setApplicationProperty("main.logging.logfilelevel", "MAIN_LOGGING_LOGFILELEVEL", baseConfig.getMain().getLogging().getLogfilelevel());
    }

    private static void setApplicationProperty(String key, String envKey, String value) {
        if (value != null && System.getProperty(key) == null && System.getenv(envKey) == null) {
            System.setProperty(key, value);
            logger.debug("Setting {} to {}", key, value);
        }
    }

    private static void initializeAndValidateAndMigrateYamlFile(File yamlFile) throws IOException {
        CONFIG_READER_WRITER.initializeIfNeeded(yamlFile);
        CONFIG_READER_WRITER.validateExistingConfig();
        Map<String, Object> map = null;
        try {
            map = CONFIG_READER_WRITER.loadSavedConfigAsMap();
        } catch (IOException e) {
            logger.error("Error loading file {}", yamlFile);
            throw e;
        }
        Map<String, Object> migrated = new ConfigMigration().migrate(map);
        CONFIG_READER_WRITER.save(migrated, yamlFile);
    }


}
