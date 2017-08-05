package org.nzbhydra;

import joptsimple.OptionParser;
import joptsimple.OptionSet;
import org.nzbhydra.config.Category;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.mapping.newznab.RssRoot;
import org.nzbhydra.migration.FromPythonMigration;
import org.nzbhydra.misc.BrowserOpener;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.SearchResultRepository;
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
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import java.io.File;
import java.io.IOException;
import java.time.Instant;
import java.util.Arrays;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

@Configuration
@EnableAutoConfiguration(exclude = {WebSocketAutoConfiguration.class, AopAutoConfiguration.class, org.springframework.boot.autoconfigure.cache.CacheAutoConfiguration.class})
@ComponentScan
@RestController
@EnableCaching
@EnableScheduling
public class NzbHydra {

    private static final Logger logger = LoggerFactory.getLogger(NzbHydra.class);

    public static String[] originalArgs;

    private static ConfigurableApplicationContext applicationContext;


    @Autowired
    private ConfigProvider configProvider;
    private static String dataFolder = null;
    private static boolean wasRestarted = false;
    @Autowired
    private SearchResultRepository searchResultRepository;

    @Autowired
    private BrowserOpener browserOpener;

    @Autowired
    private CategoryProvider categoryProvider;

    @Autowired
    private RestTemplate restTemplate;

    private static boolean anySettingsOverwritten = false;


    public static void main(String[] args) throws Exception {
        LoggerFactory.getILoggerFactory();

        OptionParser parser = new OptionParser();
        parser.accepts("datafolder", "Define path to main data folder. Must start with ./ for relative paths").withRequiredArg().defaultsTo("./data");
        parser.accepts("host", "Run on this host").withRequiredArg();
        parser.accepts("nobrowser", "Don't open browser to Hydra");
        parser.accepts("port", "Run on this port (default: 5076)").withRequiredArg();
        parser.accepts("help", "Print help");
        parser.accepts("version", "Print version");

        OptionSet options = parser.parse(args);
        if (System.getProperty("fromWrapper") == null && Arrays.stream(args).noneMatch(x -> x.equals("directstart"))) {
            System.out.println("NZBHydra 2 must be started using the wrapper for restart and updates to work. If for some reason you need to start it from the JAR directly provide the command line argument \"directstart\"");
        } else if (options.has("help")) {
            parser.printHelpOn(System.out);
        } else if (options.has("version")) {
            System.out.println(NzbHydra.class.getPackage().getImplementationVersion());
        } else {
            if (options.has("datafolder")) {
                dataFolder = (String) options.valueOf("datafolder");
            } else {
                dataFolder = "./data";
            }
            dataFolder = new File(dataFolder).getCanonicalPath();
            logger.info("Using data folder {}", dataFolder);

            System.setProperty("nzbhydra.dataFolder", dataFolder);
            System.setProperty("spring.config.location", new File(dataFolder, "nzbhydra.yml").getAbsolutePath());
            useIfSet(options, "host", "server.address");
            useIfSet(options, "port", "server.port");
            useIfSet(options, "nobrowser", "main.startupBrowser", "false");

            if (anySettingsOverwritten) {
                logger.warn("Overwritten settings will be displayed with their original value in the config section of the GUI");
            }

            SpringApplication hydraApplication = new SpringApplication(NzbHydra.class);
            NzbHydra.originalArgs = args;
            wasRestarted = Arrays.stream(args).anyMatch(x -> x.equals("restarted"));
            if (!options.has("quiet") && !options.has("nobrowser")) {
                hydraApplication.setHeadless(false); //TODO Check, it's better to run headless, perhaps read from args (--quiet or sth)
            }
            hydraApplication.setHeadless(true); //TODO Check, it's better to run headless, perhaps read from args (--quiet or sth)

            addTrayIconIfApplicable();
            applicationContext = hydraApplication.run(args);
        }
    }

    protected static void addTrayIconIfApplicable() {
        String osName = System.getProperty("os.name");
        boolean isOsWindows = osName.toLowerCase().contains("windows");
        if (isOsWindows) {
            logger.info("Adding windows system tray icon");
            new WindowsTrayIcon();
        } else {
            logger.debug("Not adding windows system tray icon because OS is {}", osName);
        }

    }

    private static void useIfSet(OptionSet options, String optionKey, String propertyName) {
        useIfSet(options, optionKey, propertyName, (String) options.valueOf(optionKey));
    }

    private static void useIfSet(OptionSet options, String optionKey, String propertyName, String propertyValue) {
        if (options.has(optionKey)) {
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
        if (configProvider.getBaseConfig().getMain().isFirstStart()) {
            logger.info("First start of NZBHydra detected");
            configProvider.getBaseConfig().getMain().setFirstStart(false);
            configProvider.getBaseConfig().getMain().setFirstStartedAt(Instant.now().getEpochSecond());
            try {
                configProvider.getBaseConfig().save();
            } catch (IOException e) {
                logger.error("Unable to save config", e);
            }
        }

        if (configProvider.getBaseConfig().getMain().isStartupBrowser()) { //TODO Overwritable per command line
            if (wasRestarted) {
                logger.info("Not opening browser after restart");
                return;
            }
            browserOpener.openBrowser();
        }
    }


    @Bean
    public CacheManager getCacheManager() {
        GuavaCacheManager guavaCacheManager = new GuavaCacheManager("infos", "titles", "updates", "dev");
        return guavaCacheManager;
    }

    @RequestMapping(value = "/rss")
    public RssRoot get() {
        RssRoot rssRoot = restTemplate.getForObject("http://127.0.0.1:5000/api?apikey=a", RssRoot.class);

        return rssRoot;
    }

    @Autowired
    private FromPythonMigration migration;

    @RequestMapping(value = "/migrate")
    public String delete() throws Exception {
        migration.migrate("http://127.0.0.1:5075/");

        return "Ok";
    }

    @RequestMapping(value = "/categories")
    public String getCats() {
        return categoryProvider.getCategories().stream().map(Category::getName).collect(Collectors.joining(","));

    }

    @RequestMapping("/test")
    @Transactional
    public String test() throws IOException, ExecutionException, InterruptedException {
        return "Ok";
    }


}
