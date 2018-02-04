package org.nzbhydra;

import joptsimple.OptionException;
import joptsimple.OptionParser;
import joptsimple.OptionSet;
import org.flywaydb.core.Flyway;
import org.h2.jdbcx.JdbcDataSource;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.debuginfos.DebugInfosProvider;
import org.nzbhydra.genericstorage.GenericStorage;
import org.nzbhydra.misc.BrowserOpener;
import org.nzbhydra.web.UrlCalculator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.aop.AopAutoConfiguration;
import org.springframework.boot.autoconfigure.websocket.WebSocketAutoConfiguration;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.guava.GuavaCacheManager;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;
import java.awt.*;
import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.time.LocalDateTime;
import java.util.Arrays;

@Configuration
@EnableAutoConfiguration(exclude = {WebSocketAutoConfiguration.class, AopAutoConfiguration.class, org.springframework.boot.autoconfigure.cache.CacheAutoConfiguration.class})
@ComponentScan
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

    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private UrlCalculator urlCalculator;
    @Autowired
    private BrowserOpener browserOpener;
    @Autowired
    private GenericStorage genericStorage;

    public static void main(String[] args) throws Exception {
        LoggerFactory.getILoggerFactory();
        String version = NzbHydra.class.getPackage().getImplementationVersion();

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
            logger.info("NZBHydra 2 version: " + version);
        } else if (options.has("repairdb")) {
            String databaseFilePath = (String) options.valueOf("repairdb");
            repairDb(databaseFilePath);
        } else {
            startup(args, options);

        }
    }

    protected static void startup(String[] args, OptionSet options) throws IOException {
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
            //It may happen that the yaml file is written empty due to some weird write right constraints in c:\program files or c:\program files (x86)
            if (dataFolderFile.getAbsolutePath().toLowerCase().contains(":\\program files")) {
                String[] split = dataFolderFile.getAbsolutePath().split("\\\\");
                logger.error("NZBHydra 2 may not work properly when run in {}\\\\{}. Please put it somewhere else", split[0], split[1]);
                System.exit(1);
            }
        }


        System.setProperty("nzbhydra.dataFolder", dataFolder);
        System.setProperty("spring.config.location", new File(dataFolder, "nzbhydra.yml").getAbsolutePath());
        useIfSet(options, "host", "server.address");
        useIfSet(options, "port", "server.port");
        useIfSet(options, "baseurl", "server.contextPath");
        useIfSet(options, "nobrowser", BROWSER_DISABLED, "true");

        SpringApplication hydraApplication = new SpringApplication(NzbHydra.class);
        NzbHydra.originalArgs = args;
        wasRestarted = Arrays.stream(args).anyMatch(x -> x.equals("restarted"));
        if (!options.has("quiet") && !options.has("nobrowser")) {
            hydraApplication.setHeadless(false);
        }

        applicationContext = hydraApplication.run(args);
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
            } catch (HeadlessException e) {
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

    @EventListener
    protected void startupDone(ApplicationReadyEvent event) {
        try {
            if (!genericStorage.get("FirstStart", LocalDateTime.class).isPresent()) {
                logger.info("First start of NZBHydra detected");
                genericStorage.save("FirstStart", LocalDateTime.now());
                try {
                    configProvider.getBaseConfig().save();
                } catch (IOException e) {
                    logger.error("Unable to save config", e);
                }
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
        logger.info("Shutting down");
    }


    @Bean
    public CacheManager getCacheManager() {
        GuavaCacheManager guavaCacheManager = new GuavaCacheManager("infos", "titles", "updates", "dev");
        return guavaCacheManager;
    }


}
