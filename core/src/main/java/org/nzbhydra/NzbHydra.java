package org.nzbhydra;

import joptsimple.OptionParser;
import joptsimple.OptionSet;
import org.nzbhydra.config.Category;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.database.IndexerRepository;
import org.nzbhydra.database.SearchResultRepository;
import org.nzbhydra.mapping.newznab.RssRoot;
import org.nzbhydra.searching.CategoryProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.aop.AopAutoConfiguration;
import org.springframework.boot.autoconfigure.websocket.WebSocketAutoConfiguration;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.boot.system.ApplicationPidFileWriter;
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

import java.awt.*;
import java.io.IOException;
import java.net.URI;
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
    @Autowired
    private SearchResultRepository searchResultRepository;

    @Autowired
    private IndexerRepository indexerRepository;

    @Autowired
    private CategoryProvider categoryProvider;

    @Autowired
    private RestTemplate restTemplate;


    public static void main(String[] args) throws Exception {
        OptionParser parser = new OptionParser();
        parser.accepts("config", "Define path to config yaml file").withRequiredArg();
        parser.accepts("database", "Define path to database base file").withRequiredArg();
        parser.accepts("host", "Run on this host").withRequiredArg();
        parser.accepts("help", "Print help");
        parser.accepts("nobrowser", "Don't open browser to Hydra");
        parser.accepts("port", "Run on this port").withRequiredArg();
        parser.accepts("version", "Print version");

        OptionSet options = parser.parse(args);
        if (options.has("help")) {
            parser.printHelpOn(System.out);
        }
        if (options.has("version")) {
            System.out.println(NzbHydra.class.getPackage().getImplementationVersion());
        } else {
            useIfSet(options, "config", "spring.config.location");
            useIfSet(options, "database", "main.databaseFile");
            useIfSet(options, "host", "server.address");
            useIfSet(options, "port", "server.port");
            useIfSet(options, "nobrowser", "main.startupBrowser", "false");

            SpringApplication hydraApplication = new SpringApplication(NzbHydra.class);
            hydraApplication.addListeners(new ApplicationPidFileWriter());
            NzbHydra.originalArgs = args;
            if (!options.has("quiet") && !options.has("nobrowser")) {
                hydraApplication.setHeadless(false); //TODO Check, it's better to run headless, perhaps read from args (--quiet or sth)
            }
            applicationContext = hydraApplication.run(args);
        }
    }

    private static void useIfSet(OptionSet options, String optionKey, String propertyName) {
        useIfSet(options, optionKey, propertyName, (String) options.valueOf(optionKey));
    }

    private static void useIfSet(OptionSet options, String optionKey, String propertyName, String propertyValue) {
        if (options.has(optionKey)) {
            System.setProperty(propertyName, propertyValue);
        }
    }

    public static ApplicationContext getApplicationContext() {
        return applicationContext;
    }

    @EventListener
    protected void startupDone(ApplicationReadyEvent event) {
        //TODO: Possible do all the initializing now / listening to this event where we can be sure that all beans have been constructed
        if (configProvider.getBaseConfig().getMain().isStartupBrowser()) { //TODO Overwritable per command line
            Desktop desktop = Desktop.isDesktopSupported() ? Desktop.getDesktop() : null;
            URI uri = configProvider.getBaseConfig().getBaseUriBuilder().build().toUri();
            logger.info("Opening {} in browser", uri);
            if (desktop != null && desktop.isSupported(Desktop.Action.BROWSE)) {
                try {
                    desktop.browse(uri);
                } catch (Exception e) {
                    logger.error("Unable to open browser", e);
                }
            } else {
                logger.error("Unable to open browser");
            }
        }
    }



    @Bean
    public CacheManager getCacheManager() {
        GuavaCacheManager guavaCacheManager = new GuavaCacheManager("infos", "titles");
        return guavaCacheManager;
    }

    @RequestMapping(value = "/rss")
    public RssRoot get() {
        RssRoot rssRoot = restTemplate.getForObject("http://127.0.0.1:5000/api?apikey=a", RssRoot.class);

        return rssRoot;
    }

    @RequestMapping(value = "/delete")
    public String delete() {
        searchResultRepository.deleteAll();
        indexerRepository.deleteAll();

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
