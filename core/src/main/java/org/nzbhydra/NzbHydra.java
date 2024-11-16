package org.nzbhydra;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.google.common.base.Strings;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import joptsimple.OptionException;
import joptsimple.OptionParser;
import joptsimple.OptionSet;
import org.apache.commons.lang3.tuple.Pair;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.BaseConfigHandler;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.ConfigReaderWriter;
import org.nzbhydra.config.migration.ConfigMigration;
import org.nzbhydra.debuginfos.DebugInfosProvider;
import org.nzbhydra.genericstorage.GenericStorage;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.misc.BrowserOpener;
import org.nzbhydra.web.UrlCalculator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.aop.AopAutoConfiguration;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.boot.web.embedded.tomcat.ConnectorStartFailedException;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.ImportRuntimeHints;
import org.springframework.context.annotation.Primary;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.web.bind.annotation.RestController;
import org.yaml.snakeyaml.error.YAMLException;

import java.io.File;
import java.io.IOException;
import java.io.PrintStream;
import java.net.URI;
import java.nio.file.Files;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Map;

@ImportRuntimeHints(NativeHints.class)
@Configuration(proxyBeanMethods = false)
@EnableAutoConfiguration(exclude = {
    AopAutoConfiguration.class, org.springframework.boot.autoconfigure.cache.CacheAutoConfiguration.class})
@ComponentScan
@RestController
@EnableCaching
@EnableScheduling
@EnableTransactionManagement
public class NzbHydra {

    private static final Logger logger = LoggerFactory.getLogger(NzbHydra.class);
    public static final String BROWSER_DISABLED = "browser.disabled";

    public static String[] originalArgs;
    private static ConfigurableApplicationContext applicationContext;
    private static String dataFolder = null;
    private static boolean wasRestarted = false;
    private static boolean anySettingsOverwritten = false;
    private static final ConfigReaderWriter CONFIG_READER_WRITER = new ConfigReaderWriter();
    public static boolean isDirectstart;

    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private UrlCalculator urlCalculator;
    @Autowired
    private BrowserOpener browserOpener;
    @Autowired
    private GenericStorage genericStorage;
    @Autowired
    private ApplicationEventPublisher applicationEventPublisher;
    @Autowired
    private BaseConfigHandler baseConfigHandler;

    @Autowired
    private DebugInfosProvider debugInfosProvider;


    public static void main(String[] args) throws Exception {
        if (isNativeBuild()) {
            logger.warn("Running for native build");

            String dataFolder = "./data";
            NzbHydra.setDataFolder(dataFolder);
            System.setProperty("nzbhydra.dataFolder", dataFolder);
            System.setProperty("spring.datasource.url", "jdbc:h2:mem:testdb;NON_KEYWORDS=YEAR,DATA,KEY");

            setApplicationPropertiesFromConfig();

            SpringApplication hydraApplication = new SpringApplication(NzbHydra.class);
            applicationContext = hydraApplication.run(args);
            logger.info("Native application returned");
            return;
        }

        OptionParser parser = new OptionParser();
        parser.accepts("datafolder", "Define path to main data folder. Must start with ./ for relative paths").withRequiredArg().defaultsTo("./data");
        parser.accepts("host", "Run on this host").withOptionalArg();
        parser.accepts("nobrowser", "Don't open browser to Hydra");
        parser.accepts("port", "Run on this port (default: 5076)").withOptionalArg();
        parser.accepts("baseurl", "Set base URL (e.g. /nzbhydra)").withOptionalArg();
        parser.accepts("help", "Print help");
        parser.accepts("version", "Print version");

        OptionSet options = null;
        try {
            options = parser.parse(args);
        } catch (OptionException e) {
            logger.error("Invalid startup options detected: {}", e.getMessage());
            System.exit(1);
        }

        setDataFolder(options);

        if (options.has("help")) {
            parser.printHelpOn(System.out);
        } else if (options.has("version")) {
            System.out.println(DebugInfosProvider.getVersionAndBuildTimestamp().getLeft());
        } else if (System.getProperty("fromWrapper") == null && Arrays.stream(args).noneMatch(x -> x.equals("directstart")) && !isDirectstart) {
            logger.info("NZBHydra 2 must be started using the wrapper for restart and updates to work. If for some reason you need to start it from the JAR directly provide the command line argument \"directstart\"");
        } else {
            startup(args, options);
        }
    }


    private static void setDataFolder(OptionSet options) throws IOException {
        if (options.has("datafolder")) {
            dataFolder = (String) options.valueOf("datafolder");
        } else {
            dataFolder = "./data";
        }
        File dataFolderFile = new File(dataFolder);
        dataFolder = dataFolderFile.getCanonicalPath();
    }

    protected static void startup(String[] args, OptionSet options) throws Exception {
        final Pair<String, String> versionAndBuildTimestamp = DebugInfosProvider.getVersionAndBuildTimestamp();
        logger.info("Version: {}", versionAndBuildTimestamp.getLeft());
        logger.info("Build timestamp: {}", versionAndBuildTimestamp.getRight());
        File dataFolderFile = new File(dataFolder);
        //Check if we can write in the data folder. If not we can just quit now
        if (!dataFolderFile.exists() && !dataFolderFile.mkdirs()) {
            logger.error("Unable to read or write data folder {}", dataFolder);
            System.exit(1);
        }
        if (isOsWindows()) {
            String programFiles = Strings.nullToEmpty(System.getenv("PROGRAMFILES")).toLowerCase();
            String programFilesx86 = Strings.nullToEmpty(System.getenv("PROGRAMFILES(X86)")).toLowerCase();
            //It may happen that the yaml file is written empty due to some weird write right constraints in c:\program files or c:\program files (x86)
            if (dataFolderFile.getAbsolutePath().toLowerCase().contains(programFiles) || dataFolderFile.getAbsolutePath().toLowerCase().contains(programFilesx86)) {
                logger.error("NZBHydra 2 may not work properly when run your windows program files folder. Please put it somewhere else");
                System.exit(1);
            }
        }

        try {
            System.setProperty("nzbhydra.dataFolder", dataFolder);
            File yamlFile = new File(dataFolder, "nzbhydra.yml");
            initializeAndValidateAndMigrateYamlFile(yamlFile);

            useIfSet(options, "host", "server.address");
            useIfSet(options, "port", "server.port");
            useIfSet(options, "baseurl", "server.servlet.context-path");
            useIfSet(options, "nobrowser", BROWSER_DISABLED, "true");

            setApplicationPropertiesFromConfig();

            SpringApplication hydraApplication = new SpringApplication(NzbHydra.class);
            NzbHydra.originalArgs = args;
            wasRestarted = Arrays.asList(args).contains("restarted");
            hydraApplication.setHeadless(true);
            applicationContext = hydraApplication.run(args);
        } catch (Exception e) {
            //Is thrown by SpringApplicationAotProcessor
            if (!(e instanceof SpringApplication.AbandonedRunException)) {
                handleException(e);
            }
        }
    }


    /**
     * Sets all properties referenced in application.properties so that they can be resolved
     */
    private static void setApplicationPropertiesFromConfig() throws IOException {
        BaseConfig baseConfig = CONFIG_READER_WRITER.loadSavedConfig();
        setApplicationProperty("main.host", "MAIN_HOST", baseConfig.getMain().getHost());
        setApplicationProperty("main.port", "MAIN_PORT", String.valueOf(baseConfig.getMain().getPort()));
        setApplicationProperty("main.urlBase", "MAIN_URL_BASE", baseConfig.getMain().getUrlBase().orElse("/"));
        setApplicationProperty("main.ssl", "MAIN_SSL", String.valueOf(baseConfig.getMain().isSsl()));
        setApplicationProperty("main.sslKeyStore", "MAIN_SSL_KEY_STORE", baseConfig.getMain().getSslKeyStore());
        setApplicationProperty("main.sslKeyStorePassword", "MAIN_SSL_KEY_STORE_PASSWORD", baseConfig.getMain().getSslKeyStorePassword());
        setApplicationProperty("main.databaseCompactTime", "MAIN_DATABASE_COMPACT_TIME", String.valueOf(baseConfig.getMain().getDatabaseCompactTime()));
        setApplicationProperty("main.databaseRetentionTime", "MAIN_DATABASE_RETENTION_TIME", String.valueOf(baseConfig.getMain().getDatabaseRetentionTime()));
        setApplicationProperty("main.databaseWriteDelay", "MAIN_DATABASE_WRITE_DELA", String.valueOf(baseConfig.getMain().getDatabaseWriteDelay()));
        setApplicationProperty("main.logging.consolelevel", "MAIN_LOGGING_CONSOLELEVEL", baseConfig.getMain().getLogging().getConsolelevel());
        setApplicationProperty("main.logging.logfilelevel", "MAIN_LOGGING_LOGFILELEVEL", baseConfig.getMain().getLogging().getLogfilelevel());
        setApplicationProperty("main.logging.logMaxHistory", "MAIN_LOGGING_LOG_MAX_HISTORY", String.valueOf(baseConfig.getMain().getLogging().getLogMaxHistory()));

        if (baseConfig.getMain().getLogging().getMarkersToLog().contains(LoggingMarkers.SERVER.getName())) {
            System.setProperty("logback.access.enabled", "true");
        } else {
            System.setProperty("logback.access.enabled", "false");
        }

        if (baseConfig.getMain().getLogging().getMarkersToLog().contains(LoggingMarkers.HTTPS.getName())) {
            System.setProperty("javax.net.debug", "ssl:handshake:verbose:keymanager:trustmanager");
            if (System.getProperty("dontRedirectConsole") == null) {
                File systemErrLogFile = new File(NzbHydra.getDataFolder(), "logs/system.err.log");
                File systemOutLogFile = new File(NzbHydra.getDataFolder(), "logs/system.out.log");
                logger.info("Enabling SSL debugging. Will write to {}", systemErrLogFile);
                System.setErr(new PrintStream(Files.newOutputStream(systemErrLogFile.toPath())));
                logger.info("Redirecting console output to system.out.log. You will not see any more log output in the console until you disable the HTTPS marker and restart NZBHydra");
                System.setOut(new PrintStream(Files.newOutputStream(systemOutLogFile.toPath())));
            }
        }
    }

    private static void setApplicationProperty(String key, String envKey, String value) {
        if (value != null && System.getProperty(key) == null && System.getenv(envKey) == null) {
            System.setProperty(key, value);
            logger.debug("Setting {} to {}", key, value);
        }
    }

    private static void initializeAndValidateAndMigrateYamlFile(File yamlFile) throws IOException {
        if (NzbHydra.isNativeBuild()) {
            return;
        }
        CONFIG_READER_WRITER.initializeIfNeeded(yamlFile);
        CONFIG_READER_WRITER.validateExistingConfig();
        Map<String, Object> map = CONFIG_READER_WRITER.loadSavedConfigAsMap();
        Map<String, Object> migrated = new ConfigMigration().migrate(map);
        CONFIG_READER_WRITER.save(migrated, yamlFile);
    }

    private static void handleException(Exception e) throws Exception {
        String msg;
        if (e.getClass().getName().contains("SilentExitException")) { //Sometimes thrown by spring boot devtools
            return;
        }
        if (e instanceof YAMLException || e instanceof JsonProcessingException) {
            msg = "The file " + new File(dataFolder, "nzbhydra.yml").getAbsolutePath() + " could not be parsed properly. It might be corrupted. Try restoring it from a backup. Error message: " + e.getMessage();
            logger.error(msg);
        }
        if (e instanceof ConnectorStartFailedException) {
            msg = "The selected port is already in use. Either shut the other application down or select another port";
            logger.error(msg);
        }
        if (e.getMessage() != null && e.getMessage().contains("Detected applied migration not resolved locally")) {
            msg = "The existing database was created by a newer version of the program than the one you're running. Make sure to get the latest release. ";
            logger.error(msg);
        } else {
            msg = "An unexpected error occurred during startup:\n" + e;
            logger.error("An unexpected error occurred during startup", e);
        }
        logger.error("FATAL: " + msg, e);

        //Rethrow so that spring exception handlers can handle this
        throw e;
    }

    public static boolean isOsWindows() {
        String osName = System.getProperty("os.name");
        return osName.toLowerCase().contains("windows");
    }

    @PostConstruct
    public void warnIfSettingsOverwritten() {
        if (anySettingsOverwritten) {
            logger.warn("Overwritten settings will be displayed with their original value in the config section of the GUI");
        }
    }


    private static void useIfSet(OptionSet options, String optionKey, String propertyName) {
        useIfSet(options, optionKey, propertyName, (String) options.valueOf(optionKey));
    }

    private static void useIfSet(OptionSet options, String optionKey, String propertyName, String propertyValue) {
        if (options.has(optionKey)) {
            logger.debug("Setting property {} to value {}", propertyName, propertyValue);
            System.setProperty(propertyName, propertyValue);
            anySettingsOverwritten = true;
        }
    }

    public static ApplicationContext getApplicationContext() {
        return applicationContext;
    }

    public static String getDataFolder() {
        return dataFolder;
    }

    @SuppressWarnings("unused")
    @EventListener
    public void startupDone(ApplicationReadyEvent event) {
        try {
            //I don't know why I have to do this but otherwise genericStorage is always empty
            configProvider.getBaseConfig().setGenericStorage(new ConfigReaderWriter().loadSavedConfig().getGenericStorage());

            if (genericStorage.get("FirstStart", LocalDateTime.class).isEmpty()) {
                logger.info("First start of NZBHydra detected");
                genericStorage.save("FirstStart", LocalDateTime.now());
                baseConfigHandler.save(false);
            }


            if (DebugInfosProvider.isRunInDocker()) {
                logger.info("You seem to be running NZBHydra 2 in docker. You can access Hydra using your local address and the IP you provided");
            } else {
                if (configProvider.getBaseConfig().getMain().isStartupBrowser() && !"true".equals(System.getProperty(BROWSER_DISABLED))) {
                    if (wasRestarted) {
                        logger.info("Not opening browser after restart");
                        return;
                    }
                    logger.debug("Opening browser");
                    browserOpener.openBrowser();
                }
                URI uri = urlCalculator.getLocalBaseUriBuilder().build().toUri();
                logger.info("You can access NZBHydra 2 in your browser via {}", uri);
            }
        } catch (Exception e) {
            logger.error("Unable to complete startup initialization", e);
        }
    }

    @PreDestroy
    public void destroy() {
        logger.info("Shutting down and using up to {}ms to compact database", configProvider.getBaseConfig().getMain().getDatabaseCompactTime());
    }


    @Bean
    @Primary
    public CacheManager genericCacheManager() {
        return new CaffeineCacheManager("infos", "titles", "updates", "dev");
    }

    static void setDataFolder(String dataFolder) {
        NzbHydra.dataFolder = dataFolder;
    }

    public static boolean isNativeBuild() {
        return System.getenv("HYDRA_NATIVE_BUILD") != null;
    }
}
