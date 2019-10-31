package org.nzbhydra;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.google.common.base.Strings;
import com.google.common.collect.Sets;
import joptsimple.OptionException;
import joptsimple.OptionParser;
import joptsimple.OptionSet;
import org.flywaydb.core.Flyway;
import org.h2.jdbcx.JdbcDataSource;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.ConfigReaderWriter;
import org.nzbhydra.config.migration.ConfigMigration;
import org.nzbhydra.debuginfos.DebugInfosProvider;
import org.nzbhydra.genericstorage.GenericStorage;
import org.nzbhydra.misc.BrowserOpener;
import org.nzbhydra.update.UpdateManager;
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
import org.springframework.context.event.EventListener;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.bind.annotation.RestController;
import org.yaml.snakeyaml.error.YAMLException;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;
import javax.swing.*;
import java.awt.*;
import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

@SuppressWarnings("ResultOfMethodCallIgnored")
@Configuration
@EnableAutoConfiguration(exclude = {
        //WebSocketServletAutoConfiguration.class,
        AopAutoConfiguration.class, org.springframework.boot.autoconfigure.cache.CacheAutoConfiguration.class})
@ComponentScan
//(excludeFilters = {@ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = {GlobalMethodSecurityConfiguration.class})})
@RestController
@EnableCaching
@EnableScheduling
public class NzbHydra {

    private static final Logger logger = LoggerFactory.getLogger(NzbHydra.class);
    public static final String BROWSER_DISABLED = "browser.disabled";

    public static String[] originalArgs;
    private static ConfigurableApplicationContext applicationContext;
    private static String dataFolder = null;
    private static boolean wasRestarted = false;
    private static boolean anySettingsOverwritten = false;
    private static ConfigReaderWriter configReaderWriter = new ConfigReaderWriter();

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

    public static void main(String[] args) throws Exception {
        LoggerFactory.getILoggerFactory();

        OptionParser parser = new OptionParser();
        parser.accepts("datafolder", "Define path to main data folder. Must start with ./ for relative paths").withRequiredArg().defaultsTo("./data");
        parser.accepts("host", "Run on this host").withOptionalArg();
        parser.accepts("nobrowser", "Don't open browser to Hydra");
        parser.accepts("port", "Run on this port (default: 5076)").withOptionalArg();
        parser.accepts("baseurl", "Set base URL (e.g. /nzbhydra)").withOptionalArg();
        parser.accepts("repairdb", "Repair database. Add database file path as argument").withRequiredArg();
        parser.accepts("help", "Print help");
        parser.accepts("version", "Print version");

        OptionSet options = null;
        try {
            options = parser.parse(args);
        } catch (OptionException e) {
            logger.error("Invalid startup options detected: {}", e.getMessage());
            System.exit(1);
        }
        if (System.getProperty("fromWrapper") == null && Arrays.stream(args).noneMatch(x -> x.equals("directstart"))) {
            logger.info("NZBHydra 2 must be started using the wrapper for restart and updates to work. If for some reason you need to start it from the JAR directly provide the command line argument \"directstart\"");
        } else if (options.has("help")) {
            parser.printHelpOn(System.out);
        } else if (options.has("version")) {
            String version = new UpdateManager().getCurrentVersionChanges().get(0).getVersion();
            logger.info("NZBHydra 2 version: " + version);
        } else if (options.has("repairdb")) {
            String databaseFilePath = (String) options.valueOf("repairdb");
            repairDb(databaseFilePath);
        } else {
            startup(args, options);
        }
    }

    protected static void startup(String[] args, OptionSet options) throws Exception {
        if (options.has("datafolder")) {
            dataFolder = (String) options.valueOf("datafolder");
        } else {
            dataFolder = "./data";
        }
        File dataFolderFile = new File(dataFolder);
        dataFolder = dataFolderFile.getCanonicalPath();
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
            wasRestarted = Arrays.stream(args).anyMatch(x -> x.equals("restarted"));
            if (!options.has("quiet") && !options.has("nobrowser")) {
                hydraApplication.setHeadless(false);
            }

            runDatabaseScript();

            applicationContext = hydraApplication.run(args);
        } catch (Exception e) {
            handleException(e);
        }
    }

    private static void runDatabaseScript() throws ClassNotFoundException, SQLException {
        if (!Thread.currentThread().getName().equals("main")) {
            //During development this class is called twice (cause of the Spring developer tools)
            logger.debug("Skipping database script check for thread {}", Thread.currentThread().getName());
            return;
        }
        File databaseFile = new File(NzbHydra.getDataFolder(), "database/nzbhydra.mv.db");
        File databaseScriptFile = new File(NzbHydra.getDataFolder(), "databaseScript.sql");
        Class.forName("org.h2.Driver");
        String url = "jdbc:h2:file:" + databaseFile.getAbsolutePath().replace(".mv.db", "");

        logger.debug("Determining if database recreation is needed");
        Set<String> executedScripts = new HashSet<>();
        try (Connection conn = DriverManager.getConnection(url, "SA", "")) {
            ResultSet resultSet = conn.createStatement().executeQuery("select \"script\" from \"schema_version\";");
            while (resultSet.next()) {
                executedScripts.add(resultSet.getString(1));
            }
        }
        PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
        try {
            HashSet<Resource> resources = Sets.newHashSet(resolver.getResources("classpath:/migration/*"));
            if (resources.stream().allMatch(x -> executedScripts.contains(x.getFilename()))) {
                logger.debug("No migration scripts found to run. Skipping database recreation");
                System.out.println("No migration script");
                return;
            }
        } catch (IOException e) {
            throw new RuntimeException("Unable to find migration scripts", e);
        }

        if (databaseScriptFile.exists()) {
            databaseScriptFile.delete();
        }

        try (Connection conn = DriverManager.getConnection(url, "SA", "")) {
            logger.info("Creating database script {} from database", databaseScriptFile.getAbsolutePath());
            conn.createStatement().execute(String.format("script to '%s'", databaseScriptFile));
            if (!databaseScriptFile.exists()) {
                throw new RuntimeException("Database script file was not created at " + databaseScriptFile.getAbsolutePath());
            }
        }

        if (!databaseFile.exists()) {
            throw new RuntimeException("Unable to find database file at " + databaseFile.getAbsolutePath());
        }
        boolean deleted = databaseFile.delete();
        if (!deleted) {
            throw new RuntimeException("Unable to delete database file at " + databaseFile.getAbsolutePath() + ". Please move it somewhere else (just to be sure) and restart NZBHYdra.");
        }

        try (Connection conn = DriverManager.getConnection(url, "SA", "")) {
            logger.info("Running database script {} for reimport of old database", databaseScriptFile.getAbsolutePath());
            try {
                conn.createStatement().execute("runscript from '" + databaseScriptFile.getAbsolutePath() + "'");
            } catch (SQLException e) {
                throw new RuntimeException("Unable to import database script", e);
            }
            logger.info("Successfully recreated database");
        }
        deleted = databaseScriptFile.delete();
        if (!deleted) {
            throw new RuntimeException("Unable to delete database script file at " + databaseScriptFile.getAbsolutePath() + ". Please delete it manually and restart NZBHYdra.");
        }
    }

    /**
     * Sets all properties referenced in application.properties so that they can be resolved
     */
    private static void setApplicationPropertiesFromConfig() throws IOException {
        BaseConfig baseConfig = configReaderWriter.loadSavedConfig();
        setApplicationProperty("main.host", "MAIN_HOST", baseConfig.getMain().getHost());
        setApplicationProperty("main.port", "MAIN_PORT", String.valueOf(baseConfig.getMain().getPort()));
        setApplicationProperty("main.urlBase", "MAIN_URL_BASE", baseConfig.getMain().getUrlBase().orElse("/"));
        setApplicationProperty("main.ssl", "MAIN_SSL", String.valueOf(baseConfig.getMain().isSsl()));
        setApplicationProperty("main.sslKeyStore", "MAIN_SSL_KEY_STORE", baseConfig.getMain().getSslKeyStore());
        setApplicationProperty("main.sslKeyStorePassword", "MAIN_SSL_KEY_STORE_PASSWORD", baseConfig.getMain().getSslKeyStorePassword());
        setApplicationProperty("main.databaseCompactTime", "MAIN_DATABASE_COMPACT_TIME", String.valueOf(baseConfig.getMain().getDatabaseCompactTime()));
        setApplicationProperty("main.logging.consolelevel", "MAIN_LOGGING_CONSOLELEVEL", baseConfig.getMain().getLogging().getConsolelevel());
        setApplicationProperty("main.logging.logfilelevel", "MAIN_LOGGING_LOGFILELEVEL", baseConfig.getMain().getLogging().getLogfilelevel());
        setApplicationProperty("main.logging.logMaxHistory", "MAIN_LOGGING_LOG_MAX_HISTORY", String.valueOf(baseConfig.getMain().getLogging().getLogMaxHistory()));
    }

    private static void setApplicationProperty(String key, String envKey, String value) {
        if (value != null && System.getProperty(key) == null && System.getenv(envKey) == null) {
            System.setProperty(key, value);
            logger.debug("Setting {} to {}", key, value);
        }
    }

    private static void initializeAndValidateAndMigrateYamlFile(File yamlFile) throws IOException {
        configReaderWriter.initializeIfNeeded(yamlFile);
        configReaderWriter.validateExistingConfig();
        Map<String, Object> map = configReaderWriter.loadSavedConfigAsMap();
        Map<String, Object> migrated = new ConfigMigration().migrate(map);
        configReaderWriter.save(migrated, yamlFile);
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
            msg = "An unexpected error occurred during startup: " + e;
            logger.error("An unexpected error occurred during startup", e);
        }
        try {
            if (!GraphicsEnvironment.isHeadless() && isOsWindows()) {
                JOptionPane.showMessageDialog(null, msg, "NZBHydra 2 error", JOptionPane.ERROR_MESSAGE);
            }
        } catch (HeadlessException e1) {
            logger.warn("Unable to show exception in message dialog: {}", e1.getMessage());
        }
        //Rethrow so that spring exception handlers can handle this
        throw e;
    }

    protected static void repairDb(String databaseFilePath) throws ClassNotFoundException {
        if (!databaseFilePath.contains("mv.db")) {
            databaseFilePath = databaseFilePath + ".mv.db";
        }
        File file = new File(databaseFilePath);
        if (!file.exists()) {
            logger.error("File {} doesn't exist", file.getAbsolutePath());
        }
        databaseFilePath = file.getAbsolutePath().substring(0, file.getAbsolutePath().length() - 6);
        Flyway flyway = new Flyway();
        flyway.setLocations("classpath:migration");
        Class.forName("org.h2.Driver");
        JdbcDataSource dataSource = new JdbcDataSource();
        dataSource.setURL("jdbc:h2:file:" + databaseFilePath);
        dataSource.setUser("sa");

        flyway.setDataSource(dataSource);
        flyway.repair();
    }

    @PostConstruct
    private void addTrayIconIfApplicable() {
        boolean isOsWindows = isOsWindows();
        if (isOsWindows) {
            logger.info("Adding windows system tray icon");
            try {
                new WindowsTrayIcon();
            } catch (Throwable e) {
                logger.error("Can't add a windows tray icon because running headless");
            }
        }
    }

    private static boolean isOsWindows() {
        String osName = System.getProperty("os.name");
        return osName.toLowerCase().contains("windows");
    }

    @PostConstruct
    private void warnIfSettingsOverwritten() {
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
            if (!genericStorage.get("FirstStart", LocalDateTime.class).isPresent()) {
                logger.info("First start of NZBHydra detected");
                genericStorage.save("FirstStart", LocalDateTime.now());
                configProvider.getBaseConfig().save(false);
            }

            if (DebugInfosProvider.isRunInDocker()) {
                logger.info("You seem to be running NZBHydra 2 in docker. You can access Hydra using your local address and the IP you provided");
            } else if (configProvider.getBaseConfig().getMain().isStartupBrowser() && !"true".equals(System.getProperty(BROWSER_DISABLED))) {
                if (wasRestarted) {
                    logger.info("Not opening browser after restart");
                    return;
                }
                browserOpener.openBrowser();
            } else {
                URI uri = urlCalculator.getLocalBaseUriBuilder().build().toUri();
                logger.info("You can access NZBHydra 2 in your browser via {}", uri);
            }
        } catch (Exception e) {
            logger.error("Unable to complete startup initialization", e);
        }
    }

    @PreDestroy
    public void destroy() {
        boolean isOsWindows = isOsWindows();
        if (isOsWindows) {
            logger.debug("Initiating removal of windows tray icon (if it exists)");
            try {
                WindowsTrayIcon.remove();
            } catch (Throwable e) {
                //An exception might be thrown while shutting down, ignore this
            }
        }
        applicationEventPublisher.publishEvent(new ShutdownEvent());
        logger.info("Shutting down and using up to {}ms to compact database", configProvider.getBaseConfig().getMain().getDatabaseCompactTime());
    }


    @Bean
    public CacheManager getCacheManager() {
        return new CaffeineCacheManager("infos", "titles", "updates", "dev");
    }


}
